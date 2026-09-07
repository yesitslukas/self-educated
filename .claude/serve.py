"""Dev server that refuses to cache, so module edits show up on reload."""
import functools, http.server, socketserver, sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1])
    handler = functools.partial(NoCache, directory='/Users/lukasjanik/self-educated')
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', port), handler) as httpd:
        httpd.serve_forever()
