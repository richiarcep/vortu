"""Regression suite for the security hardening (argon2, token revocation, rotating
refresh tokens, audit hash-chain, pagination caps, GDPR, Veri*Factu).

Runs on an ISOLATED temp SQLite DB (never touches nexum.db). Uses stdlib
unittest + FastAPI TestClient, so no extra dependency is required:

    cd backend && python -m unittest tests.test_security        # stdlib
    cd backend && python -m pytest tests/test_security.py        # if pytest present
"""
import os
import tempfile
import unittest

# Point the app at an isolated DB + a strong test secret BEFORE importing anything
# from the app (the engine + settings are built at import time).
_TMP_DB = os.path.join(tempfile.mkdtemp(), "test_vela.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-definitely-32+chars-long")
os.environ.setdefault("DEBUG", "true")

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from core.database import create_tables, ensure_runtime_schema, SessionLocal  # noqa: E402

create_tables()
ensure_runtime_schema()
# config_fiscal + the other raw fiscal tables are seeded by setup_db, not the
# startup path — create them so the Veri*Factu test has its precondition.
import setup_db  # noqa: E402
setup_db.create_raw_tables()
client = TestClient(main.app, raise_server_exceptions=False)

_counter = {"n": 0}


def _register(country="ES"):
    """Register a fresh company/user and return (email, password)."""
    _counter["n"] += 1
    email = f"user{_counter['n']}@example.com"
    pw = "Sup3rSecret!pw"
    r = client.post("/api/auth/register", json={
        "full_name": "Test User", "email": email, "password": pw,
        "company_name": f"Co{_counter['n']}", "country": country,
    })
    assert r.status_code in (200, 201), r.text
    return email, pw


def _login(email, pw):
    return client.post("/api/auth/login", data={"username": email, "password": pw})


class TestHashing(unittest.TestCase):
    def test_argon2_and_legacy_bcrypt(self):
        from core.security import hash_password, verify_password, needs_rehash
        import bcrypt
        h = hash_password("s3cret!")
        self.assertTrue(h.startswith("$argon2"))
        self.assertTrue(verify_password("s3cret!", h))
        self.assertFalse(verify_password("wrong", h))
        self.assertFalse(needs_rehash(h))
        legacy = bcrypt.hashpw(b"s3cret!", bcrypt.gensalt(12)).decode()
        self.assertTrue(verify_password("s3cret!", legacy))
        self.assertTrue(needs_rehash(legacy))  # bcrypt → flagged for upgrade

    def test_garbage_never_raises(self):
        from core.security import verify_password
        self.assertFalse(verify_password("x", ""))
        self.assertFalse(verify_password("x", "garbage"))


class TestLoginRevocation(unittest.TestCase):
    def test_login_and_token_version_revocation(self):
        email, pw = _register()
        r = _login(email, pw)
        self.assertEqual(r.status_code, 200)
        token = r.json()["access_token"]
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me.status_code, 200)
        # logout bumps token_version → the old access token is revoked
        client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        me2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me2.status_code, 401)

    def test_bad_password_and_account_throttle_audited(self):
        email, pw = _register()
        r = _login(email, "wrong-password")
        self.assertEqual(r.status_code, 401)
        db = SessionLocal()
        n = db.execute(text("SELECT count(*) FROM security_audit_log WHERE event='login_failure'")).scalar()
        db.close()
        self.assertGreaterEqual(n, 1)


class TestRefreshRotation(unittest.TestCase):
    def test_rotation_and_theft_detection(self):
        from core import refresh as R
        from models.user import User
        email, pw = _register()
        _login(email, pw)
        db = SessionLocal()
        u = db.query(User).filter(User.email == email).first()
        tv0 = u.token_version
        A = R.issue(db, u)
        # rotate A→B→C
        rB = client.post("/api/auth/refresh", cookies={"vela_refresh": A})
        self.assertEqual(rB.status_code, 200)
        B = rB.cookies.get("vela_refresh")
        rC = client.post("/api/auth/refresh", cookies={"vela_refresh": B})
        self.assertEqual(rC.status_code, 200)
        C = rC.cookies.get("vela_refresh")
        # replay A (revoked, replacement also rotated) → theft → 401, family nuked, tv bumped
        rReuse = client.post("/api/auth/refresh", cookies={"vela_refresh": A})
        self.assertEqual(rReuse.status_code, 401)
        db.expire_all()
        tv1 = db.query(User).filter(User.email == email).first().token_version
        self.assertGreater(tv1, tv0)
        # live token C is dead after the family nuke
        self.assertEqual(client.post("/api/auth/refresh", cookies={"vela_refresh": C}).status_code, 401)
        db.close()

    def test_2fa_temp_token_assertion(self):
        from core.security import create_access_token
        from models.user import User
        email, pw = _register()
        db = SessionLocal(); u = db.query(User).filter(User.email == email).first(); db.close()
        # a full-session token (carries tv/plan_id) must be rejected at the 2FA exchange
        full = create_access_token(data={"sub": str(u.id), "is_admin": u.is_admin, "plan_id": "pro", "tv": u.token_version or 0})
        r = client.post("/api/auth/2fa/verify-login", json={"code": "000000"},
                        headers={"Authorization": f"Bearer {full}"})
        self.assertEqual(r.status_code, 401)


class TestAuditChain(unittest.TestCase):
    def test_chain_and_tamper(self):
        from core.audit import audit_event, verify_chain
        db = SessionLocal()
        audit_event(db, "test_a", actor_email="a@x", ip="1.1.1.1")
        audit_event(db, "test_b", actor_email="b@x", ip="1.1.1.1")
        self.assertTrue(verify_chain(db)["ok"])
        db.execute(text("UPDATE security_audit_log SET detail='tampered' WHERE event='test_a'"))
        db.commit()
        self.assertFalse(verify_chain(db)["ok"])
        db.close()


class TestPaginationCaps(unittest.TestCase):
    def test_over_cap_rejected(self):
        email, pw = _register()
        token = _login(email, pw).json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        self.assertEqual(client.get("/api/ventas/historial?limit=50", headers=h).status_code, 200)
        self.assertEqual(client.get("/api/ventas/historial?limit=99999", headers=h).status_code, 422)


class TestGDPR(unittest.TestCase):
    def test_export_contains_pii(self):
        email, pw = _register()
        token = _login(email, pw).json()["access_token"]
        r = client.get("/api/me/export", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["user"]["email"], email)
        self.assertIn("company", r.json())


class TestVerifactu(unittest.TestCase):
    def test_chain_idempotency_anular_tamper(self):
        from modules.fiscal.verifactu import emitir, anular, verify_chain
        from models.user import User
        email, pw = _register(country="ES")
        db = SessionLocal()
        u = db.query(User).filter(User.email == email).first()
        cid = u.company_id
        # seed an ES fiscal config for the company
        db.execute(text(
            "INSERT INTO config_fiscal (company_id, pais, nit, serie_dte, siguiente_numero, ambiente, created_at, updated_at) "
            "VALUES (:c,'ES','B12345678','A',1,'pruebas',:ts,:ts)"), {"c": cid, "ts": "2026-06-26"})
        db.commit()
        r1 = emitir(db, cid, {"importe_total": 121.0, "cuota_total": 21.0}, idempotency_key="k1")
        r2 = emitir(db, cid, {"importe_total": 242.0, "cuota_total": 42.0}, idempotency_key="k2")
        self.assertEqual(r2["huella_anterior"], r1["huella"])  # chained
        self.assertEqual(r2["numero"], r1["numero"] + 1)        # sequential
        self.assertEqual(emitir(db, cid, {}, idempotency_key="k1")["id"], r1["id"])  # idempotent
        self.assertTrue(verify_chain(db, cid)["ok"])
        an = anular(db, cid, r1["id"])
        self.assertEqual(an["registro_anulado_id"], r1["id"])   # linked, not deleted
        self.assertTrue(verify_chain(db, cid)["ok"])
        db.execute(text("UPDATE verifactu_registro SET importe_total=9999 WHERE id=:i"), {"i": r2["id"]})
        db.commit()
        self.assertFalse(verify_chain(db, cid)["ok"])           # tamper detected
        db.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
