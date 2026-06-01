"""Configure the DeepSeek provider row for the cheap text-extraction role.

DeepSeek's API is OpenAI-compatible; the extraction router uses it for TEXT steps
(cheap first pass on born-digital docs) but never for vision. It only becomes active
once DEEPSEEK_API_KEY is set in the environment (routing checks the key), so running
this is safe and changes nothing until you add the key.

Run: python configure_deepseek.py
"""
import sqlite3
from core.config import get_settings

db_path = get_settings().DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

# deepseek-chat (V3) — cheap workhorse. Pricing ~ $0.27/M in, $1.10/M out → per-1k below.
ROW = {
    "provider": "deepseek",
    "display_name": "DeepSeek Chat",
    "model_id": "deepseek-chat",
    "api_key_env": "DEEPSEEK_API_KEY",
    "base_url": "https://api.deepseek.com/v1",
    "is_active": 1,
    "plan_required": "base",
    "cost_per_1k_input": 0.0003,
    "cost_per_1k_output": 0.0011,
    "max_tokens": 4096,
    "timeout_seconds": 60,
}


def main():
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    exists = cur.execute("SELECT id FROM vera_models_config WHERE provider='deepseek'").fetchone()
    if exists:
        cur.execute(
            "UPDATE vera_models_config SET display_name=:display_name, model_id=:model_id, "
            "api_key_env=:api_key_env, base_url=:base_url, is_active=:is_active, "
            "plan_required=:plan_required, cost_per_1k_input=:cost_per_1k_input, "
            "cost_per_1k_output=:cost_per_1k_output, max_tokens=:max_tokens, "
            "timeout_seconds=:timeout_seconds WHERE provider='deepseek'", ROW)
        print("updated existing deepseek row")
    else:
        cols = ", ".join(ROW); ph = ", ".join(f":{k}" for k in ROW)
        cur.execute(f"INSERT INTO vera_models_config ({cols}) VALUES ({ph})", ROW)
        print("inserted deepseek row")
    con.commit()
    r = cur.execute("SELECT provider, model_id, base_url, is_active, cost_per_1k_input, cost_per_1k_output "
                    "FROM vera_models_config WHERE provider='deepseek'").fetchone()
    con.close()
    print("deepseek config:", r)
    print("→ Set DEEPSEEK_API_KEY in .env to activate (text steps will auto-route to it).")


if __name__ == "__main__":
    main()
