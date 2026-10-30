from datetime import date

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

from .db import connect


DAMAGE_TYPES = [
    "NID_DE_POULE",
    "FISSURE",
    "AFFAISSEMENT",
    "ORNIERE",
    "EROSION",
    "AUTRE",
]


def load_reports() -> pd.DataFrame:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, latitude, longitude, region, city, "roadName",
                       "damageType", "sizeEstimate", description,
                       "severityScore", "severityClass", status,
                       "createdAt"
                FROM "Report"
                ORDER BY "createdAt"
                """
            )
            rows = cur.fetchall()

    if not rows:
        return pd.DataFrame(
            columns=[
                "id",
                "latitude",
                "longitude",
                "region",
                "city",
                "roadName",
                "damageType",
                "sizeEstimate",
                "severityScore",
                "severityClass",
                "status",
                "createdAt",
            ]
        )

    df = pd.DataFrame(rows)
    df["latitude"] = df["latitude"].astype(float)
    df["longitude"] = df["longitude"].astype(float)
    df["createdAt"] = pd.to_datetime(df["createdAt"], utc=True)
    return df


def classify(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    df = df.copy()
    base = {
        "NID_DE_POULE": 18,
        "FISSURE": 12,
        "AFFAISSEMENT": 28,
        "ORNIERE": 20,
        "EROSION": 24,
        "AUTRE": 10,
    }

    size = df["sizeEstimate"].fillna(1.0).astype(float)
    size_factor = np.clip(size * 6, 0, 28)
    type_factor = df["damageType"].map(base).fillna(10)
    age_days = (pd.Timestamp.now(tz="UTC") - df["createdAt"]).dt.days.fillna(0)
    age_factor = np.clip(age_days / 30, 0, 8)

    score = type_factor + size_factor + age_factor + 10
    score = np.clip(score + np.random.RandomState(1234).uniform(-4, 6, len(df)), 0, 100)
    df["severityScore"] = score.round(1)

    df["severityClass"] = pd.cut(
        df["severityScore"],
        bins=[-1, 29, 54, 74, 100],
        labels=["LEGERE", "MODEREE", "GRAVE", "CRITIQUE"],
    ).astype(str)

    df.loc[df["severityClass"] == "nan", "severityClass"] = None
    return df


def clusters(df: pd.DataFrame, eps_km: float = 0.5, min_samples: int = 2) -> dict:
    if df.empty:
        return {
            "epsKm": eps_km,
            "minSamples": min_samples,
            "clusterCount": 0,
            "noiseCount": 0,
            "clusters": [],
        }

    coords = df[["latitude", "longitude"]].to_numpy()
    scaler = StandardScaler()
    normalized = scaler.fit_transform(coords)
    eps_rad = eps_km / 6371.0088
    model = DBSCAN(eps=eps_rad, min_samples=min_samples, metric="haversine")
    labels = model.fit_predict(normalized)

    df = df.copy()
    df["cluster"] = labels
    result_clusters = []
    noise_count = 0

    for label in set(labels):
        if label == -1:
            noise_count = int((labels == -1).sum())
            continue
        group = df[df["cluster"] == label]
        center_lat = group["latitude"].mean()
        center_lng = group["longitude"].mean()
        avg_score = group["severityScore"].dropna().mean() if group["severityScore"].notna().any() else None
        region = group["region"].dropna().mode()
        city = group["city"].dropna().mode()
        damage_types = group["damageType"].dropna().unique().tolist()
        result_clusters.append(
            {
                "latitude": round(float(center_lat), 6),
                "longitude": round(float(center_lng), 6),
                "count": int(len(group)),
                "avgSeverity": round(float(avg_score), 1) if avg_score is not None else None,
                "region": str(region.iloc[0]) if not region.empty else None,
                "city": str(city.iloc[0]) if not city.empty else None,
                "damageTypes": sorted(set(damage_types)),
            }
        )

    result_clusters.sort(key=lambda item: item["count"], reverse=True)
    return {
        "epsKm": eps_km,
        "minSamples": min_samples,
        "clusterCount": len(result_clusters),
        "noiseCount": noise_count,
        "clusters": result_clusters,
    }


def trends(df: pd.DataFrame) -> dict:
    if df.empty:
        return {"months": [], "forecast": []}

    df = df.copy()
    df["month"] = df["createdAt"].dt.tz_convert(None).dt.to_period("M").astype(str)
    monthly = df.groupby("month").agg(count=("id", "count"), avgSeverity=("severityScore", "mean")).reset_index()
    monthly = monthly.sort_values("month")

    forecast = []
    if len(monthly) >= 2:
        months_idx = np.arange(len(monthly))
        counts = monthly["count"].astype(float).to_numpy()
        coeffs = np.polyfit(months_idx, counts, 1)
        poly = np.poly1d(coeffs)
        last_month = date.fromisoformat(monthly["month"].iloc[-1] + "-01")
        for i in range(1, 4):
            idx = len(monthly) + i - 1
            pred = max(1, round(float(poly(idx))))
            month_idx = last_month.month + i
            year = last_month.year + (month_idx - 1) // 12
            month = ((month_idx - 1) % 12) + 1
            next_month = date(year, month, 1)
            forecast.append({"month": next_month.strftime("%Y-%m"), "count": int(pred)})
    else:
        last_month = date.fromisoformat(monthly["month"].iloc[-1] + "-01")
        for i in range(1, 4):
            month_idx = last_month.month + i
            year = last_month.year + (month_idx - 1) // 12
            month = ((month_idx - 1) % 12) + 1
            next_month = date(year, month, 1)
            forecast.append({"month": next_month.strftime("%Y-%m"), "count": int(monthly["count"].iloc[0])})

    months_out = []
    for row in monthly.itertuples():
        months_out.append(
            {
                "month": row.month,
                "count": int(row.count),
                "avgSeverity": round(float(row.avgSeverity), 1) if pd.notna(row.avgSeverity) else None,
            }
        )
    return {"months": months_out, "forecast": forecast}


def summary(df: pd.DataFrame) -> dict:
    if df.empty:
        return {
            "totals": {"reports": 0, "last30d": 0, "avgSeverity": None, "critical": 0, "unresolved": 0},
            "byStatus": [],
            "byDamageType": [],
            "bySeverity": [],
            "byRegion": [],
            "recentPoints": [],
        }

    now = pd.Timestamp.now(tz="UTC")
    last30 = df[df["createdAt"] >= now - pd.Timedelta(days=30)]
    unresolved = df[~df["status"].isin(["REPART"])]
    critical = df[df["severityClass"] == "CRITIQUE"]

    def agg_count(col: str):
        return [
            {"key": group_name, "count": int(count)}
            for group_name, count in df[col].fillna("INCONNU").value_counts().items()
        ]

    by_status = [{"status": item["key"], "count": item["count"]} for item in agg_count("status") if item["key"] != "INCONNU"]
    by_damage = [{"damageType": item["key"], "count": item["count"]} for item in agg_count("damageType")]
    by_severity = [{"severityClass": item["key"], "count": item["count"]} for item in agg_count("severityClass") if item["key"] != "nan"]

    region_stats = df.groupby("region").agg(count=("id", "count"), avgSeverity=("severityScore", "mean")).reset_index()
    by_region = []
    for row in region_stats.itertuples():
        if pd.isna(row.region):
            continue
        by_region.append(
            {
                "region": str(row.region),
                "count": int(row.count),
                "avgSeverity": round(float(row.avgSeverity), 1) if pd.notna(row.avgSeverity) else None,
            }
        )
    by_region.sort(key=lambda item: item["count"], reverse=True)

    recent = df.tail(80).copy()
    recent_points = []
    for row in recent.itertuples():
        recent_points.append(
            {
                "id": row.id,
                "latitude": float(row.latitude),
                "longitude": float(row.longitude),
                "severityClass": None if pd.isna(row.severityClass) or row.severityClass == "nan" else row.severityClass,
                "status": row.status,
                "city": row.city if pd.notna(row.city) else None,
                "roadName": row.roadName if pd.notna(row.roadName) else None,
            }
        )

    avg_score = df["severityScore"].dropna().mean()
    return {
        "totals": {
            "reports": int(len(df)),
            "last30d": int(len(last30)),
            "avgSeverity": round(float(avg_score), 1) if pd.notna(avg_score) else None,
            "critical": int(len(critical)),
            "unresolved": int(len(unresolved)),
        },
        "byStatus": by_status,
        "byDamageType": by_damage,
        "bySeverity": by_severity,
        "byRegion": by_region,
        "recentPoints": recent_points,
    }
