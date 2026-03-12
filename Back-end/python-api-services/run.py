from app import create_app

app = create_app()
print("Cổng đang mở ở PORT 5000")

if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )
