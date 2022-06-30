import json
import os
from urllib.parse import unquote
import signal
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer


class RelayServer(BaseHTTPRequestHandler):
    def do_GET(self):
        api_command = unquote(self.path)
        print("GET >> API command =", api_command)
        if api_command.endswith('/'):
            self.process_ui('/index.html')
        elif api_command.endswith('/getlibrary'):
            self.process_ui('/library/library.json')
        elif api_command.endswith('.html') or \
                api_command.endswith('.js') or \
                api_command.endswith('.css') or \
                api_command.endswith('.ico') or \
                api_command.endswith('.gif') or \
                api_command.endswith('.png') or \
                api_command.endswith('.jpeg') or \
                api_command.endswith('.jpg'):
            self.process_ui(api_command)
        return

    def do_POST(self):
        api_command = unquote(self.path)
        print("PUT >> API command =", api_command)
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        data = json.loads(body)
        print(data)
        if api_command == '/deleteimage':
            if self.process_deleteimage(data):
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Delete successful')
            else:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Delete failed')
        return

    def process_deleteimage(self, data):
        try:
            os.remove('/app' + data['path'])
            print('/app' + data['path'] + " deleted")
            self.create_catalogue()
        except FileNotFoundError:
            return False
        return True

    def process_ui(self, path):
        if path.endswith('.html'):
            response_content_type = 'text/html'
        elif path.endswith('.js'):
            response_content_type = 'text/javascript'
        elif path.endswith('.css'):
            response_content_type = 'text/css'
        elif path.endswith('.ico'):
            response_content_type = 'image/x-icon'
        elif path.endswith('.gif'):
            response_content_type = 'image/gif'
        elif path.endswith('.png'):
            response_content_type = 'image/png'
        elif path.endswith('.jpg'):
            response_content_type = 'image/jpeg'
        else:
            response_content_type = 'text/plain'

        file_path = '/app' + path

        try:
            with open(file_path, 'rb') as data_file:
                data = data_file.read()
                self.log_message(file_path + ' file read successfully')
                self.send_response(200)
                self.send_header('Content-Type', response_content_type)
                self.end_headers()
                self.wfile.write(data)

        except FileNotFoundError:
            self.log_message(file_path + ' file not found')
            self.send_response(404)
            self.end_headers()

    def create_catalogue(self):
        library = []
        for root, dirs, files in os.walk("/app/library", topdown=False):
            for name in files:
                library.append(os.path.join(root, name).replace("/app/library/", "/library/"))

        with open("/app/library/library.json", "w", encoding="utf8") as outfile:
            outfile.write(json.dumps(library))

        print("Updated catalogue")


def exit_signal_handler(self, sig):
    sys.stderr.write('Shutting down...\n')
    sys.stderr.flush()
    quit()


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, exit_signal_handler)
    signal.signal(signal.SIGINT, exit_signal_handler)
    relayServerRef = HTTPServer(("", 3000), RelayServer)
    sys.stderr.write('Frontend Web Server\n\n')
    sys.stderr.flush()

    try:
        relayServerRef.serve_forever()
    except KeyboardInterrupt:
        pass

    relayServerRef.server_close()
    sys.stderr.write('Relay Server Stopped Successfully\n')
