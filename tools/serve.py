"""Petit serveur local pour la démonstration : comme « python -m http.server », mais sans cache navigateur,
pour que chaque modification soit visible immédiatement. Usage : py -3 tools/serve.py [port]"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # sortie silencieuse


if __name__ == "__main__":
    os.chdir(ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), NoCache) as srv:
        print(f"MPPE démo : http://localhost:{PORT}/index.html  (Ctrl+C pour arrêter)")
        srv.serve_forever()
