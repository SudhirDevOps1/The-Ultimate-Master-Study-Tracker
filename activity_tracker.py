import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

# Try to import Windows-specific modules for foreground window tracking
try:
    import win32gui
    import win32process
    import psutil
    win32_available = True
except ImportError:
    win32_available = False

def get_active_window():
    if not win32_available:
        return {"title": "win32gui not installed", "process": "unknown"}
    
    try:
        hwnd = win32gui.GetForegroundWindow()
        if hwnd:
            title = win32gui.GetWindowText(hwnd)
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            try:
                process = psutil.Process(pid)
                process_name = process.name()
            except Exception:
                process_name = "unknown"
            return {"title": title or "Desktop / Idle", "process": process_name}
        return {"title": "Desktop / Idle", "process": "unknown"}
    except Exception as e:
        return {"title": f"Error: {str(e)}", "process": "error"}

class TrackerHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress logging request output to keep the console clean
        return

    def do_OPTIONS(self):
        # Handle CORS preflight request
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/active-window':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = get_active_window()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = {
                "status": "ok",
                "win32_available": win32_available,
                "service": "FlowTrack Activity Tracker"
            }
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode('utf-8'))

def run(port=5001):
    server_address = ('', port)
    try:
        httpd = HTTPServer(server_address, TrackerHandler)
    except OSError as e:
        if "address already in use" in str(e).lower() or e.errno == 10048:
            print(f"[ERROR] Port {port} is already in use.")
            print(f"        Another instance of Activity Tracker might already be running.")
            print(f"        Close the other instance or use a different port:")
            print(f"        python activity_tracker.py {port + 1}")
            sys.exit(1)
        else:
            raise
    
    print(f"FlowTrack Local Activity Tracker running on http://localhost:{port}")
    print(f"  - Active window:  http://localhost:{port}/active-window")
    print(f"  - Health check:   http://localhost:{port}/health")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down activity tracker.")
        sys.exit(0)

if __name__ == '__main__':
    port = 5001
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run(port)
