import json
import os
import random
from urllib.parse import unquote
import signal
import sys
import redis
import uuid
from scheduler import update_library_catalogue

from http.server import BaseHTTPRequestHandler, HTTPServer

global_dictionary = []


# function to read dictionary.txt and return a dictionary
def read_dictionary():
    with open('dictionary.txt', 'r') as f:
        dictionary = f.read().splitlines()
    return dictionary


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
        elif api_command == '/queue_status':
            queue_data = self.check_queue_request()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('X-Nick-Salt', get_random_dictionary_word())
            self.end_headers()
            response_body = json.dumps(queue_data)
            self.wfile.write(response_body.encode())
        return

    def do_POST(self):
        api_command = unquote(self.path)
        print("POST >> API command =", api_command)
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        data = json.loads(body)
        print(data)
        if api_command == '/prompt':
            result = self.queue_request_to_redis(data)
            if result == 'X':
                self.send_response(500)
                self.end_headers()
            else:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('X-Nick-Salt', get_random_dictionary_word())
                self.end_headers()
                response_body = '{"queue_id": "' + result + '"}'
                self.wfile.write(response_body.encode())

        elif api_command == '/deleteimage':
            if self.process_deleteimage(data):
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"success": true}')
            else:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"success": false}')
        return

    def queue_request_to_redis(self, data):
        try:
            r = redis.Redis(host='dalle-scheduler', port=6379, db=0, password='hellothere')
            data['uuid'] = str(uuid.uuid4())
            r.lpush('queue', json.dumps(data))
            print("Request queued to redis with uuid:", data['uuid'])
            return data['uuid']
        except Exception as e:
            print("queue_request_to_redis Error:", e)
            return 'X'

    def check_queue_request(self):
        try:
            r = redis.Redis(host='dalle-scheduler', port=6379, db=0, password='hellothere')
            queue_list = []
            queue_data = r.lrange('queue', 0, -1)
            for queue_item in queue_data:
                queue_list.append(json.loads(queue_item.decode()))
            queue_list.reverse()
            return queue_list
        except Exception as e:
            print("check_queue_request Error:", e)
            return []

    def process_deleteimage(self, data):
        try:
            os.remove('/app/' + data['path'])
            print('/app/' + data['path'] + " deleted")
            update_library_catalogue()
        except FileNotFoundError as fnfe:
            print("FileNotFoundError:", fnfe)
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
                self.send_header('X-Nick-Salt', get_random_dictionary_word())
                self.end_headers()
                self.wfile.write(data)

        except FileNotFoundError:
            self.log_message(file_path + ' file not found')
            self.send_response(404)
            self.end_headers()


def exit_signal_handler(self, sig):
    sys.stderr.write('Shutting down...\n')
    sys.stderr.flush()
    quit()


# gets next dictionary word from dictionary.txt
def get_next_dictionary_word(current_word):
    global global_dictionary
    if len(global_dictionary) == 0:
        global_dictionary = read_dictionary()
    if current_word == '':
        return global_dictionary[0]
    else:
        for i in range(len(global_dictionary)):
            if global_dictionary[i] == current_word:
                if i + 1 < len(global_dictionary):
                    return global_dictionary[i + 1]
                else:
                    return global_dictionary[0]
        return global_dictionary[0]


# choose random word from global_dictionary
def get_random_dictionary_word():
    global global_dictionary
    if len(global_dictionary) == 0:
        global_dictionary = read_dictionary()
    return global_dictionary[random.randint(0, len(global_dictionary) - 1)]


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, exit_signal_handler)
    signal.signal(signal.SIGINT, exit_signal_handler)
    relayServerRef = HTTPServer(("", 3000), RelayServer)
    sys.stderr.write('Frontend Web Server\n\n')
    sys.stderr.flush()
    global_dictionary = read_dictionary()

    try:
        relayServerRef.serve_forever()
    except KeyboardInterrupt:
        pass

    relayServerRef.server_close()
    sys.stderr.write('Relay Server Stopped Successfully\n')
