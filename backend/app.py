from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

import os

from extentions import db, migrate

# Load environment variables from .env file
load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DB_CONNECTION")

    db.init_app(app)
    
    migrate.init_app(app, db)

    
    from routes.friend import friends_bp
    from routes.user import user_bp

    app.register_blueprint(friends_bp)    
    app.register_blueprint(user_bp)

    return app

app = create_app()


if __name__ == '__main__':
    app.run(debug=True, port=8080)
