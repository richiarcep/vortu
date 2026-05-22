# modules/marketing/platforms.py
"""
Real API integrations for Google Ads and Meta Ads.

Google Ads uses the google-ads Python client library.
Meta Ads uses the facebook-business SDK.

Both require credentials stored in PlatformCredential model.
"""
import json
import httpx
from datetime import datetime, timedelta
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# GOOGLE ADS
# ─────────────────────────────────────────────────────────────────────────────

async def verify_google_credentials(creds: dict) -> dict:
    """Test Google Ads credentials by fetching accessible customers."""
    try:
        # Exchange refresh token for access token
        token_res = await _google_refresh_token(creds)
        if not token_res.get("access_token"):
            return {"connected": False, "error": "No se pudo obtener access token de Google"}

        access_token = token_res["access_token"]

        # List accessible customers
        async with httpx.AsyncClient() as http:
            res = await http.get(
                "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "developer-token": creds.get("developer_token", ""),
                },
                timeout=15,
            )

        if res.status_code == 200:
            data = res.json()
            return {
                "connected": True,
                "customer_ids": data.get("resourceNames", []),
                "message": f"Conectado. {len(data.get('resourceNames', []))} cuenta(s) accesibles.",
            }
        else:
            return {"connected": False, "error": res.json().get("error", {}).get("message", "Error desconocido")}

    except Exception as e:
        return {"connected": False, "error": str(e)}


async def create_google_campaign(creds: dict, campaign_data: dict, copies: dict) -> dict:
    """
    Creates a full Google Ads campaign:
    1. Create Campaign
    2. Create Ad Group
    3. Create Responsive Search Ad
    4. Add Keywords
    Returns dict with campaign_id, ad_group_id, ad_id
    """
    try:
        token_res = await _google_refresh_token(creds)
        access_token = token_res.get("access_token")
        if not access_token:
            return {"success": False, "error": "Token inválido"}

        customer_id = creds.get("customer_id", "").replace("-", "")
        dev_token = creds.get("developer_token", "")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "developer-token": dev_token,
            "login-customer-id": customer_id,
            "Content-Type": "application/json",
        }

        base_url = f"https://googleads.googleapis.com/v17/customers/{customer_id}"

        async with httpx.AsyncClient(timeout=30) as http:

            # 1. Create Campaign
            budget_res = await http.post(
                f"{base_url}/campaignBudgets:mutate",
                headers=headers,
                json={
                    "operations": [{
                        "create": {
                            "name": f"Budget - {campaign_data['name']}",
                            "amountMicros": int(campaign_data.get("budget_daily", 10) * 1_000_000),
                            "deliveryMethod": "STANDARD",
                        }
                    }]
                }
            )
            if budget_res.status_code != 200:
                return {"success": False, "error": f"Error creando presupuesto: {budget_res.text}"}

            budget_resource = budget_res.json()["results"][0]["resourceName"]

            camp_res = await http.post(
                f"{base_url}/campaigns:mutate",
                headers=headers,
                json={
                    "operations": [{
                        "create": {
                            "name": campaign_data["name"],
                            "status": "PAUSED",  # Start paused for safety
                            "advertisingChannelType": "SEARCH",
                            "campaignBudget": budget_resource,
                            "startDate": campaign_data.get("start_date", datetime.now().strftime("%Y%m%d")),
                            "endDate": campaign_data.get("end_date", (datetime.now() + timedelta(days=30)).strftime("%Y%m%d")),
                            "targetSpend": {},
                        }
                    }]
                }
            )
            if camp_res.status_code != 200:
                return {"success": False, "error": f"Error creando campaña: {camp_res.text}"}

            campaign_resource = camp_res.json()["results"][0]["resourceName"]
            campaign_id = campaign_resource.split("/")[-1]

            # 2. Create Ad Group
            ag_res = await http.post(
                f"{base_url}/adGroups:mutate",
                headers=headers,
                json={
                    "operations": [{
                        "create": {
                            "name": f"{campaign_data['name']} - Grupo 1",
                            "campaign": campaign_resource,
                            "status": "ENABLED",
                            "cpcBidMicros": 1_000_000,  # €1 default CPC
                        }
                    }]
                }
            )
            if ag_res.status_code != 200:
                return {"success": False, "error": f"Error creando grupo: {ag_res.text}"}

            ad_group_resource = ag_res.json()["results"][0]["resourceName"]
            ad_group_id = ad_group_resource.split("/")[-1]

            # 3. Create Responsive Search Ad
            headlines = copies.get("headlines", [])[:15]
            descriptions = copies.get("descriptions", [])[:4]

            ad_res = await http.post(
                f"{base_url}/adGroupAds:mutate",
                headers=headers,
                json={
                    "operations": [{
                        "create": {
                            "adGroup": ad_group_resource,
                            "status": "ENABLED",
                            "ad": {
                                "responsiveSearchAd": {
                                    "headlines": [{"text": h} for h in headlines],
                                    "descriptions": [{"text": d} for d in descriptions],
                                    "path1": copies.get("display_path", [""])[0][:15],
                                    "path2": copies.get("display_path", ["", ""])[1][:15] if len(copies.get("display_path", [])) > 1 else "",
                                },
                                "finalUrls": [campaign_data.get("final_url", "https://example.com")],
                            }
                        }
                    }]
                }
            )

            ad_id = ""
            if ad_res.status_code == 200:
                ad_resource = ad_res.json()["results"][0]["resourceName"]
                ad_id = ad_resource.split("/")[-1]

            # 4. Add Keywords
            keywords = []
            for kw in copies.get("keywords", {}).get("exact", [])[:10]:
                keywords.append({
                    "adGroup": ad_group_resource,
                    "status": "ENABLED",
                    "keyword": {
                        "text": kw.strip("[]"),
                        "matchType": "EXACT",
                    }
                })
            for kw in copies.get("keywords", {}).get("phrase", [])[:10]:
                keywords.append({
                    "adGroup": ad_group_resource,
                    "status": "ENABLED",
                    "keyword": {
                        "text": kw,
                        "matchType": "PHRASE",
                    }
                })

            if keywords:
                await http.post(
                    f"{base_url}/adGroupCriteria:mutate",
                    headers=headers,
                    json={"operations": [{"create": kw} for kw in keywords]}
                )

        return {
            "success": True,
            "campaign_id": campaign_id,
            "ad_group_id": ad_group_id,
            "ad_id": ad_id,
            "message": f"Campaña '{campaign_data['name']}' creada en Google Ads (pausada para revisión)",
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_google_metrics(creds: dict, campaign_id: str, days: int = 14) -> list[dict]:
    """Fetch campaign metrics from Google Ads API."""
    try:
        token_res = await _google_refresh_token(creds)
        access_token = token_res.get("access_token")
        if not access_token:
            return []

        customer_id = creds.get("customer_id", "").replace("-", "")
        date_from = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        date_to = datetime.now().strftime("%Y-%m-%d")

        query = f"""
            SELECT
                segments.date,
                metrics.impressions,
                metrics.clicks,
                metrics.ctr,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.average_cpc
            FROM campaign
            WHERE campaign.id = {campaign_id}
            AND segments.date BETWEEN '{date_from}' AND '{date_to}'
            ORDER BY segments.date DESC
        """

        async with httpx.AsyncClient(timeout=20) as http:
            res = await http.post(
                f"https://googleads.googleapis.com/v17/customers/{customer_id}/googleAds:search",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "developer-token": creds.get("developer_token", ""),
                },
                json={"query": query},
            )

        if res.status_code != 200:
            return []

        rows = res.json().get("results", [])
        metrics = []
        for row in rows:
            seg = row.get("segments", {})
            m = row.get("metrics", {})
            spend = m.get("costMicros", 0) / 1_000_000
            clicks = m.get("clicks", 0)
            conversions = m.get("conversions", 0)
            metrics.append({
                "platform": "google",
                "date": seg.get("date", ""),
                "impressions": m.get("impressions", 0),
                "clicks": clicks,
                "ctr": round(m.get("ctr", 0) * 100, 2),
                "spend": round(spend, 2),
                "conversions": int(conversions),
                "conversion_rate": round((conversions / clicks * 100) if clicks > 0 else 0, 2),
                "cpc": round(m.get("averageCpc", 0) / 1_000_000, 2),
                "cpa": round((spend / conversions) if conversions > 0 else 0, 2),
                "roas": round((m.get("conversionsValue", 0) / spend) if spend > 0 else 0, 2),
            })

        return metrics

    except Exception as e:
        return []


async def _google_refresh_token(creds: dict) -> dict:
    """Exchange refresh token for access token."""
    async with httpx.AsyncClient(timeout=10) as http:
        res = await http.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": creds.get("client_id", ""),
                "client_secret": creds.get("client_secret", ""),
                "refresh_token": creds.get("refresh_token", ""),
                "grant_type": "refresh_token",
            }
        )
    return res.json()


# ─────────────────────────────────────────────────────────────────────────────
# META ADS (Facebook + Instagram)
# ─────────────────────────────────────────────────────────────────────────────

META_BASE = "https://graph.facebook.com/v19.0"


async def verify_meta_credentials(creds: dict) -> dict:
    """Verify Meta Ads credentials by checking account info."""
    try:
        account_id = creds.get("account_id", "")
        token = creds.get("access_token", "")

        if not account_id.startswith("act_"):
            account_id = f"act_{account_id}"

        async with httpx.AsyncClient(timeout=15) as http:
            res = await http.get(
                f"{META_BASE}/{account_id}",
                params={
                    "access_token": token,
                    "fields": "id,name,currency,account_status,business",
                }
            )

        data = res.json()
        if "error" in data:
            return {"connected": False, "error": data["error"].get("message", "Error de Meta")}

        return {
            "connected": True,
            "account_name": data.get("name"),
            "currency": data.get("currency"),
            "status": data.get("account_status"),
            "message": f"Conectado a '{data.get('name')}' ({data.get('currency')})",
        }

    except Exception as e:
        return {"connected": False, "error": str(e)}


async def create_meta_campaign(creds: dict, campaign_data: dict, copies: dict) -> dict:
    """
    Creates a full Meta campaign structure:
    1. Campaign
    2. Ad Set (audience + budget)
    3. Ad Creative
    4. Ad
    """
    try:
        account_id = creds.get("account_id", "")
        if not account_id.startswith("act_"):
            account_id = f"act_{account_id}"
        token = creds.get("access_token", "")

        objective_map = {
            "awareness":   "REACH",
            "traffic":     "LINK_CLICKS",
            "leads":       "LEAD_GENERATION",
            "sales":       "CONVERSIONS",
            "retargeting": "CONVERSIONS",
        }

        meta_objective = copies.get("campaign_objective",
            objective_map.get(campaign_data.get("objective", "traffic"), "LINK_CLICKS"))

        audience = copies.get("audience", {})
        ad_variant = copies.get("ads", [{}])[0]

        async with httpx.AsyncClient(timeout=30) as http:

            # 1. Create Campaign
            camp_res = await http.post(
                f"{META_BASE}/{account_id}/campaigns",
                params={"access_token": token},
                json={
                    "name": campaign_data["name"],
                    "objective": meta_objective,
                    "status": "PAUSED",
                    "special_ad_categories": [],
                }
            )
            camp_data = camp_res.json()
            if "error" in camp_data:
                return {"success": False, "error": camp_data["error"].get("message")}

            campaign_id = camp_data["id"]

            # 2. Create Ad Set
            targeting = {
                "age_min": audience.get("age_min", 18),
                "age_max": audience.get("age_max", 65),
                "geo_locations": {
                    "countries": ["ES"],
                },
            }

            adset_res = await http.post(
                f"{META_BASE}/{account_id}/adsets",
                params={"access_token": token},
                json={
                    "name": f"{campaign_data['name']} - Audiencia Principal",
                    "campaign_id": campaign_id,
                    "daily_budget": int(campaign_data.get("budget_daily", 10) * 100),  # cents
                    "billing_event": "IMPRESSIONS",
                    "optimization_goal": copies.get("optimization_goal", "LINK_CLICKS"),
                    "targeting": targeting,
                    "status": "PAUSED",
                    "start_time": campaign_data.get("start_date", datetime.now().isoformat()),
                }
            )
            adset_data = adset_res.json()
            if "error" in adset_data:
                return {"success": False, "error": adset_data["error"].get("message")}

            adset_id = adset_data["id"]

            # 3. Create Ad Creative
            creative_res = await http.post(
                f"{META_BASE}/{account_id}/adcreatives",
                params={"access_token": token},
                json={
                    "name": f"Creative - {campaign_data['name']}",
                    "object_story_spec": {
                        "page_id": creds.get("page_id", ""),
                        "link_data": {
                            "message": ad_variant.get("primary_text", ""),
                            "link": campaign_data.get("final_url", "https://example.com"),
                            "name": ad_variant.get("headline", ""),
                            "description": ad_variant.get("description", ""),
                            "call_to_action": {
                                "type": ad_variant.get("cta", "LEARN_MORE"),
                                "value": {"link": campaign_data.get("final_url", "https://example.com")},
                            },
                        }
                    }
                }
            )
            creative_data = creative_res.json()
            creative_id = creative_data.get("id", "")

            # 4. Create Ad
            ad_res = await http.post(
                f"{META_BASE}/{account_id}/ads",
                params={"access_token": token},
                json={
                    "name": f"Ad - {campaign_data['name']} v1",
                    "adset_id": adset_id,
                    "creative": {"creative_id": creative_id},
                    "status": "PAUSED",
                }
            )
            ad_data = ad_res.json()
            ad_id = ad_data.get("id", "")

        return {
            "success": True,
            "campaign_id": campaign_id,
            "adset_id": adset_id,
            "ad_id": ad_id,
            "message": f"Campaña '{campaign_data['name']}' creada en Meta Ads (pausada para revisión)",
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_meta_metrics(creds: dict, campaign_id: str, days: int = 14) -> list[dict]:
    """Fetch campaign metrics from Meta Graph API."""
    try:
        token = creds.get("access_token", "")
        date_from = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        date_to = datetime.now().strftime("%Y-%m-%d")

        async with httpx.AsyncClient(timeout=20) as http:
            res = await http.get(
                f"{META_BASE}/{campaign_id}/insights",
                params={
                    "access_token": token,
                    "fields": "date_start,impressions,clicks,ctr,spend,conversions,cpc,cpp,actions",
                    "time_increment": 1,
                    "time_range": json.dumps({"since": date_from, "until": date_to}),
                    "level": "campaign",
                }
            )

        data = res.json()
        if "error" in data:
            return []

        metrics = []
        for row in data.get("data", []):
            clicks = int(row.get("clicks", 0))
            spend = float(row.get("spend", 0))
            impressions = int(row.get("impressions", 0))

            # Extract conversions from actions array
            conversions = 0
            for action in row.get("actions", []):
                if action.get("action_type") in ("offsite_conversion", "lead", "purchase"):
                    conversions += int(action.get("value", 0))

            metrics.append({
                "platform": "meta",
                "date": row.get("date_start", ""),
                "impressions": impressions,
                "clicks": clicks,
                "ctr": round(float(row.get("ctr", 0)), 2),
                "spend": round(spend, 2),
                "conversions": conversions,
                "conversion_rate": round((conversions / clicks * 100) if clicks > 0 else 0, 2),
                "cpc": round(float(row.get("cpc", 0)), 2),
                "cpa": round((spend / conversions) if conversions > 0 else 0, 2),
                "roas": 0,  # Would need conversion value
            })

        return metrics

    except Exception as e:
        return []


async def pause_meta_campaign(creds: dict, campaign_id: str) -> dict:
    token = creds.get("access_token", "")
    async with httpx.AsyncClient(timeout=10) as http:
        res = await http.post(
            f"{META_BASE}/{campaign_id}",
            params={"access_token": token},
            json={"status": "PAUSED"}
        )
    return {"success": res.status_code == 200}


async def resume_meta_campaign(creds: dict, campaign_id: str) -> dict:
    token = creds.get("access_token", "")
    async with httpx.AsyncClient(timeout=10) as http:
        res = await http.post(
            f"{META_BASE}/{campaign_id}",
            params={"access_token": token},
            json={"status": "ACTIVE"}
        )
    return {"success": res.status_code == 200}


async def pause_google_campaign(creds: dict, campaign_id: str) -> dict:
    token_res = await _google_refresh_token(creds)
    access_token = token_res.get("access_token")
    customer_id = creds.get("customer_id", "").replace("-", "")
    async with httpx.AsyncClient(timeout=10) as http:
        res = await http.post(
            f"https://googleads.googleapis.com/v17/customers/{customer_id}/campaigns:mutate",
            headers={"Authorization": f"Bearer {access_token}", "developer-token": creds.get("developer_token", "")},
            json={"operations": [{"update": {"resourceName": f"customers/{customer_id}/campaigns/{campaign_id}", "status": "PAUSED"}, "updateMask": "status"}]}
        )
    return {"success": res.status_code == 200}


async def resume_google_campaign(creds: dict, campaign_id: str) -> dict:
    token_res = await _google_refresh_token(creds)
    access_token = token_res.get("access_token")
    customer_id = creds.get("customer_id", "").replace("-", "")
    async with httpx.AsyncClient(timeout=10) as http:
        res = await http.post(
            f"https://googleads.googleapis.com/v17/customers/{customer_id}/campaigns:mutate",
            headers={"Authorization": f"Bearer {access_token}", "developer-token": creds.get("developer_token", "")},
            json={"operations": [{"update": {"resourceName": f"customers/{customer_id}/campaigns/{campaign_id}", "status": "ENABLED"}, "updateMask": "status"}]}
        )
    return {"success": res.status_code == 200}