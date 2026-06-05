import type { CSSProperties } from "react";
import Link from "next/link";
import {
  homeApproachGroups,
  homeCategories,
  homeHeroStats
} from "@/lib/kompendiumHomeData";
import { ScrollToTop } from "./ScrollToTop";

export function KompendiumHome() {
  return (
    <>
      <section className="hero">
        <h1>
          Narzędzia terapeutyczne
          <br />
          w <em>jednym miejscu</em>
        </h1>
        <p>
          Kompendium interwencji CBT, DBT, ACT i nie tylko — z handoutami do druku,
          instrukcjami krok po kroku i farmakoterapią opartą na wytycznych.
        </p>
        <div className="hero-disclaimer">
          ⚠️ Materiał referencyjny dla profesjonalistów · Nie zastępuje superwizji ani
          terapii
        </div>
        <div className="stats">
          {homeHeroStats.map((s) => (
            <div key={s.label} className="stat">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {homeCategories.map((cat) => (
        <section key={cat.title} className="home-category">
          <div className="cat-header">
            <h2 className="cat-title" style={{ color: cat.titleColor }}>
              {cat.title}
            </h2>
            <span className="cat-subtitle">{cat.subtitle}</span>
            <div className="cat-line" />
          </div>
          <div className="home-items">
            {cat.items.map((item) => (
              <Link
                key={item.slug}
                href={`/modules/${item.slug}`}
                className="home-btn"
                style={{ "--btn-color": item.color } as CSSProperties}
              >
                <span className="card-icon">{item.icon}</span>
                <span className="home-btn-name">{item.name}</span>
                <span className="home-btn-count">{item.countLabel}</span>
                <span className="home-btn-desc">{item.description}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="home-approaches">
        <div className="cat-header">
          <h2 className="cat-title" style={{ color: "var(--k-emerald)" }}>
            Podejścia i narzędzia
          </h2>
          <span className="cat-subtitle">Metody terapeutyczne, dokumenty, umiejętności</span>
          <div className="cat-line" />
        </div>
        {homeApproachGroups.map((group) => (
          <div key={group.label} className="appr-cat">
            <div className="appr-cat-label">{group.label}</div>
            <div className="appr-grid">
              {group.chips.map((chip) => (
                <Link
                  key={chip.slug}
                  href={`/modules/${chip.slug}`}
                  className="home-btn appr-chip"
                  style={{ "--btn-color": chip.color } as CSSProperties}
                >
                  <div className="appr-dot" />
                  <span className="home-btn-name">{chip.name}</span>
                  <span className="home-btn-count">{chip.count}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="home-footer">
        <p>
          Kompendium Narzędzi Terapeutycznych — 1580 narzędzi · 879 handoutów · 28 kart
          farmakoterapii
        </p>
      </div>

      <ScrollToTop />
    </>
  );
}
