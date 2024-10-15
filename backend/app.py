from flask import Flask
from dotenv import load_dotenv
import os
from extentions import db, migrate, login_manager

# Load environment variables from .env file
load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DB_CONNECTION")

    app.secret_key = b"\xfe#\xed%f\xc0\x83\x08\xf8'#\xd7\xf5\xf1\xff\x14L\xd6\xd7<a'E\xf7"

    db.init_app(app)
    
    migrate.init_app(app, db)
    login_manager.init_app(app)
        
    from routes.friend import friends_bp
    from routes.user import user_bp

    app.register_blueprint(friends_bp)    
    app.register_blueprint(user_bp)


    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=8080)
