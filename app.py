from flask import Flask, render_template, jsonify, request, redirect, url_for
import random

app = Flask(__name__)

app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # cache 1 year


def get_cards(mode: str):
    if mode == "easy":
        n = 5
    elif mode == "medium":
        n = 10
    elif mode == "hard":
        n = 15
    elif mode == "expert":
        n = 20
    else:
        n = 5
    return [f"char_{i}.png" for i in range(1, n+1)]

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/game")
def game():
    mode = request.args.get("mode", "easy").lower()
    return render_template("index.html", mode=mode)

@app.route("/new-game")
def new_game():
    mode = request.args.get("mode", "easy").lower()
    cards = get_cards(mode)
    deck = cards * 2
    random.shuffle(deck)
    return jsonify(deck=deck, mode=mode)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
