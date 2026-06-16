#!/usr/bin/env python3
"""
Recupera os exames de um paciente da API HICD e persiste os dados BRUTOS porém
ORGANIZADOS em output/exames/<prontuario>.json — para não re-requisitar o que já
foi recuperado.

Uso:
    # usa cache se existir e estiver dentro do TTL; senão busca na API e grava
    python3 scripts/exames_store.py 574779 --nome "DAVI OLIVEIRA DA CRUZ" --leito "UTI Neonatal — 2"

    # força nova busca (ignora cache)
    python3 scripts/exames_store.py 574779 --force

A API precisa estar no ar (npm run api) e logada (POST /api/auth/login feito uma vez).
Não há auth por requisição — a sessão é mantida pelo crawler singleton no servidor.

Estrutura gravada:
{
  "meta":   { prontuario, nome, leito, fetchedAt, baseUrl, totalRequisicoes, datas: [...] },
  "porData":{ "DD/MM": { SIGLA: valor_sanitizado, ... }, ... },
  "porTema":{ "HEMOGRAMA": [ {rotulo, sigla, valores:{ "DD/MM": valor }} ], ... },
  "bruto":  [ <requisições originais da API, intactas> ]
}
"""
import json, argparse, os, sys, time, urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fluxograma_exames import GRUPOS, limpa  # reaproveita mapa de temas + sanitização

DEFAULT_BASE = "http://localhost:3000"
DEFAULT_DIR = "output/exames"


def buscar_api(prontuario, base_url):
    url = ("%s/api/pacientes/%s/exames?formato=resultados&incluirResultados=true"
           % (base_url.rstrip("/"), prontuario))
    with urllib.request.urlopen(url, timeout=300) as resp:
        payload = json.loads(resp.read().decode("utf-8", "replace"))
    if not payload.get("success"):
        raise SystemExit("API retornou erro: %s" % payload.get("message", payload))
    return payload.get("data", [])


def organizar(bruto):
    por_data = {}
    for e in bruto:
        d = (e.get("data") or "")[:5]
        if not d:
            continue
        g = por_data.setdefault(d, {})
        for r in (e.get("resultados") or []):
            s = r.get("sigla") or r.get("nome") or "?"
            v = limpa((r.get("resultado") or r.get("valor") or "").strip())
            if v and v != "0":
                g[s] = v
            elif s not in g:
                g[s] = v
    datas = sorted(por_data.keys(), key=lambda d: (d.split("/")[1], d.split("/")[0]))

    por_tema = {}
    for tema, rows in GRUPOS:
        linhas = []
        for rotulo, sig in rows:
            valores = {d: por_data[d].get(sig, "") for d in datas if sig and por_data[d].get(sig)}
            linhas.append({"rotulo": rotulo, "sigla": sig, "valores": valores})
        por_tema[tema] = linhas
    return por_data, por_tema, datas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prontuario")
    ap.add_argument("--nome", default="")
    ap.add_argument("--leito", default="")
    ap.add_argument("--base-url", default=DEFAULT_BASE)
    ap.add_argument("--cache-dir", default=DEFAULT_DIR)
    ap.add_argument("--ttl-hours", type=float, default=12.0)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    os.makedirs(a.cache_dir, exist_ok=True)
    path = os.path.join(a.cache_dir, "%s.json" % a.prontuario)

    if os.path.exists(path) and not a.force:
        idade_h = (time.time() - os.path.getmtime(path)) / 3600
        if idade_h <= a.ttl_hours:
            doc = json.load(open(path, encoding="utf-8"))
            m = doc.get("meta", {})
            print("HIT  %s | datas: %d | idade: %.1fh | %s"
                  % (path, len(m.get("datas", [])), idade_h, m.get("nome", "")))
            return

    bruto = buscar_api(a.prontuario, a.base_url)
    por_data, por_tema, datas = organizar(bruto)
    doc = {
        "meta": {
            "prontuario": a.prontuario,
            "nome": a.nome,
            "leito": a.leito,
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "baseUrl": a.base_url,
            "totalRequisicoes": len(bruto),
            "datas": datas,
        },
        "porData": por_data,
        "porTema": por_tema,
        "bruto": bruto,
    }
    json.dump(doc, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("MISS %s | datas: %d | requisições: %d | gravado"
          % (path, len(datas), len(bruto)))


if __name__ == "__main__":
    main()
