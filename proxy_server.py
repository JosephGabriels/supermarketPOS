from flask import Flask, send_from_directory, request
import requests

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        # Proxy API requests to backend
        backend_url = 'http://127.0.0.1:8000/' + path
        try:
            resp = requests.request(
                method=request.method,
                url=backend_url,
                headers={key: value for (key, value) in request.headers if key != 'Host'},
                data=request.get_data(),
                cookies=request.cookies,
                allow_redirects=False
            )
            return resp.content, resp.status_code, resp.headers.items()
        except requests.exceptions.RequestException:
            return 'Backend unavailable', 503
    else:
        # Serve frontend files
        if path == '' or path == '/':
            return send_from_directory('frontend/dist', 'index.html')
        try:
            return send_from_directory('frontend/dist', path)
        except FileNotFoundError:
            return send_from_directory('frontend/dist', 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)