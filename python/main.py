"""
Inforix Finviz Microservice
Provides enriched stock data via finvizfinance + pandas.
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import pandas as pd

app = FastAPI(title="Inforix Finviz Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def safe_float(val) -> float | None:
    """Parse numeric strings like '12.5%', '1.2B', '-' to float."""
    if val is None or str(val).strip() in ("-", "", "N/A"):
        return None
    try:
        s = str(val).replace("%", "").replace("$", "").replace(",", "").strip()
        if s.endswith("B"):
            return float(s[:-1]) * 1e9
        if s.endswith("M"):
            return float(s[:-1]) * 1e6
        if s.endswith("K"):
            return float(s[:-1]) * 1e3
        return float(s)
    except (ValueError, AttributeError):
        return None


def parse_fundamentals(fund: dict) -> dict:
    """Extract and normalise key metrics from finvizfinance fundamentals dict."""
    return {
        # Valuation
        "pe":               safe_float(fund.get("P/E")),
        "fwdPe":            safe_float(fund.get("Forward P/E")),
        "pb":               safe_float(fund.get("P/B")),
        "ps":               safe_float(fund.get("P/S")),
        "peg":              safe_float(fund.get("PEG")),
        "eps":              safe_float(fund.get("EPS (ttm)")),
        # Profitability
        "roe":              safe_float(fund.get("ROE")),
        "roa":              safe_float(fund.get("ROA")),
        "roi":              safe_float(fund.get("ROI")),
        "grossMargin":      safe_float(fund.get("Gross Margin")),
        "operMargin":       safe_float(fund.get("Oper. Margin")),
        "netMargin":        safe_float(fund.get("Profit Margin")),
        # Growth (quarter-over-quarter)
        "revenueGrowthQoQ": safe_float(fund.get("Sales Q/Q")),
        "epsGrowthQoQ":     safe_float(fund.get("EPS Q/Q")),
        # Dividends
        "dividendYield":    safe_float(fund.get("Dividend %")),
        # Risk / market
        "beta":             safe_float(fund.get("Beta")),
        "high52":           safe_float(fund.get("52W High")),
        "low52":            safe_float(fund.get("52W Low")),
        "rsi14":            safe_float(fund.get("RSI (14)")),
        "shortFloat":       fund.get("Short Float", ""),
        # Analyst
        "analystTarget":    safe_float(fund.get("Target Price")),
        "analystRecom":     fund.get("Recom.", ""),
        # Solvency
        "currentRatio":     safe_float(fund.get("Current Ratio")),
        "debtEq":           safe_float(fund.get("Debt/Eq")),
        # Volume
        "avgVolume":        safe_float(fund.get("Avg Volume")),
        "relVolume":        safe_float(fund.get("Rel Volume")),
        # Info
        "earningsDate":     fund.get("Earnings", ""),
        "employees":        fund.get("Employees", ""),
        "marketCap":        fund.get("Market Cap", ""),
        # Live price from Finviz (15-min delayed)
        "price":            safe_float(fund.get("Price")),
        "change":           safe_float(fund.get("Change")),
        "volume":           safe_float(fund.get("Volume")),
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stock/{ticker}")
def get_stock(ticker: str):
    """
    Return comprehensive stock data for a given ticker.
    Uses finvizfinance to scrape Finviz (15-min delayed prices).
    """
    try:
        from finvizfinance.quote import finvizfinance
        fvf = finvizfinance(ticker.upper())

        fund = fvf.TickerFundamentals()

        # ── News ──────────────────────────────────────────────────────────────
        news_list = []
        try:
            news_df = fvf.TickerNews()
            if news_df is not None and not news_df.empty:
                for _, row in news_df.head(5).iterrows():
                    news_list.append({
                        "headline": str(row.get("Title", "")),
                        "url":      str(row.get("Link", "")),
                        "source":   str(row.get("Source", "")),
                        "date":     str(row.get("Date", "")),
                    })
        except Exception:
            pass

        # ── Analyst ratings (upgrade/downgrade history) ───────────────────────
        analyst_list = []
        try:
            analyst_df = fvf.TickerAnalystRatings()
            if analyst_df is not None and not analyst_df.empty:
                for _, row in analyst_df.head(5).iterrows():
                    analyst_list.append({
                        "date":   str(row.get("Date", "")),
                        "action": str(row.get("Action", "")),
                        "firm":   str(row.get("Analyst", "")),
                        "from":   str(row.get("Rating Change", "")),
                        "target": str(row.get("Price Target Change", "")),
                    })
        except Exception:
            pass

        # ── Insider trading ───────────────────────────────────────────────────
        insider_list = []
        try:
            insider_df = fvf.TickerInsiderTrading()
            if insider_df is not None and not insider_df.empty:
                for _, row in insider_df.head(5).iterrows():
                    insider_list.append({
                        "owner":       str(row.get("Insider Trading", "")),
                        "relationship":str(row.get("Relationship", "")),
                        "date":        str(row.get("Date", "")),
                        "transaction": str(row.get("Transaction", "")),
                        "cost":        str(row.get("Cost", "")),
                        "shares":      str(row.get("#Shares", "")),
                        "value":       str(row.get("Value ($)", "")),
                    })
        except Exception:
            pass

        # ── Summarise with pandas ─────────────────────────────────────────────
        metrics = parse_fundamentals(fund)
        metrics_series = pd.Series({k: v for k, v in metrics.items() if v is not None})
        summary = {
            "has_positive_growth": bool(
                (metrics_series.get("revenueGrowthQoQ", 0) or 0) > 0
                and (metrics_series.get("epsGrowthQoQ", 0) or 0) > 0
            ),
            "rsi_zone": (
                "oversold" if (metrics.get("rsi14") or 50) < 30
                else "overbought" if (metrics.get("rsi14") or 50) > 70
                else "neutral"
            ),
            "near_52w_high": bool(
                metrics.get("price") and metrics.get("high52")
                and metrics["price"] / metrics["high52"] > 0.95
            ),
        }

        return {
            "ticker":      ticker.upper(),
            "company":     fund.get("Company", ticker),
            "sector":      fund.get("Sector", ""),
            "industry":    fund.get("Industry", ""),
            "country":     fund.get("Country", ""),
            "description": fund.get("Description", ""),
            "metrics":     metrics,
            "summary":     summary,
            "news":        news_list,
            "analysts":    analyst_list,
            "insiders":    insider_list,
        }

    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/screen/top")
def screen_top(cap: str = "mega"):
    """
    Screen stocks by market cap category.
    cap: 'mega' | 'large' | 'mid'
    Returns up to 100 tickers with basic metrics as a JSON list.
    """
    try:
        from finvizfinance.screener.overview import Overview
        cap_map = {
            "mega":  "Mega ($200bln and more)",
            "large": "Large ($10bln to $200bln)",
            "mid":   "Mid ($2bln to $10bln)",
        }
        fov = Overview()
        fov.set_filter(filters_dict={"Market Cap.": cap_map.get(cap, cap_map["mega"])})
        df = fov.ScreenerView(order="Market Cap")
        wanted = ["Ticker", "Company", "Sector", "Industry", "Country", "Market Cap", "P/E", "Change", "Volume"]
        cols = [c for c in wanted if c in df.columns]
        return {"stocks": df[cols].head(100).to_dict("records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/screen/hot")
def screen_hot():
    """
    Return today's top movers from Finviz screener (Most Volatile signal).
    Used for the '오늘의 핫 종목' section.
    """
    try:
        from finvizfinance.screener.overview import Overview
        fov = Overview()
        fov.set_filter(signal='Most Volatile', filters_dict={})
        df = fov.ScreenerView(verbose=0)

        stocks = []
        for _, row in df.head(20).iterrows():
            change = safe_float(row.get("Change", ""))
            price  = safe_float(row.get("Price",  ""))
            ticker = str(row.get("Ticker", "")).strip()
            if price and change is not None and ticker and ticker not in ("nan", ""):
                stocks.append({
                    "symbol": ticker,
                    "price":  round(price,  2),
                    "change": round(change, 2),
                })

        stocks.sort(key=lambda x: abs(x["change"]), reverse=True)
        return {"stocks": stocks[:10]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.environ.get("FINVIZ_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
