"""Where the Flask server lives."""

from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello_world():
    """Test function"""
    return "<p>Hello, World!</p>"
