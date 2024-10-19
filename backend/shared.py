from typing import Dict, MutableSequence
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_socketio import SocketIO

from engineio.payload import Payload
Payload.max_decode_packets = 200


_users_in_room : Dict[str, set[str]] = {} 
_room_of_sid : Dict[str, str] = {} 
_name_of_sid: Dict[str, str]  = {} 
_user_id_to_sid: Dict[str, str]  = {} 
_sid_to_user_id: Dict[str, str]  = {} 


db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()


