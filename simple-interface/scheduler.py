import json
import time
import redis
import uuid
import requests


def get_next_queue_request():
    try:
        r = redis.Redis(host='dalle-scheduler', port=6379, db=0, password='hellothere')
        queue_list = []
        queue_data = r.lrange('queue', 0, -1)
        if len(queue_data) > 0:
            for current_queue_item in queue_data:
                queue_list.append(json.loads(current_queue_item.decode()))
            queue_list.reverse()
            return queue_list[0]
        else:
            return {'uuid': 'X'}

    except Exception as e:
        print("get_next_queue_request Error:", e)
        return {'uuid': 'X'}


def delete_request_from_redis_queue(queue_data):
    try:
        r = redis.Redis(host='dalle-scheduler', port=6379, db=0, password='hellothere')
        print('Deleting queue item:', queue_data)
        r.lrem('queue', 0, json.dumps(queue_data))
        return True
    except redis.exceptions.ConnectionError as ce:
        print("delete_request_from_redis_queue Connection Error:", ce)
        return False
    except Exception as e:
        print("delete_request_from_redis_queue Error:", e)
        return False


def send_request_to_dalle_engine(prompt_info):
    try:
        prompt_json = json.dumps(prompt_info)
        r = requests.post('http://dalle-backend:8080/dalle', json=prompt_json)
        return r.json()
    except Exception as e:
        print("send_request_to_dalle_engine Error:", e)
        return {'uuid': 'X'}


if __name__ == "__main__":
    print("Scheduler started")
    while True:
        time.sleep(1)
        print("Checking queue")
        queue_item = get_next_queue_request()
        print("Queue item:", queue_item)
        if queue_item['uuid'] != 'X':
            print("Sending request to dalle engine")
            request_data = send_request_to_dalle_engine(queue_item)
            print("Request data:", request_data)
            if request_data['success'] and request_data['uuid'] == queue_item['uuid']:
                delete_request_from_redis_queue(queue_item)
            else:
                print("Request failed")
