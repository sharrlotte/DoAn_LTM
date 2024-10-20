from datetime import timedelta
from dotenv import load_dotenv
import os

from flask_socketio import SocketIO
from schema.user import User
from schema.friend import Friend
from shared import db, migrate, login_manager, _users_in_room, _room_of_sid, _name_of_sid
from flask import Flask,  request
from flask_cors import CORS
from flask_socketio import emit, join_room, leave_room

from shared import _users_in_room, _room_of_sid, _name_of_sid, _user_id_to_sid, _sid_to_user_id
from flask_jwt_extended import JWTManager, create_access_token,  jwt_required, get_jwt_identity,decode_token
from flask_sslify import SSLify

load_dotenv()

import logging
logging.basicConfig(level=logging.DEBUG)

def create_app():
    app = Flask(__name__)
        
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DB_CONNECTION")
    app.config['JWT_SECRET_KEY'] = os.environ.get("SECRET_KEY")
    app.config['JWT_TOKEN_LOCATION'] =  ['headers']
    app.secret_key = os.environ.get("SECRET_KEY")

    db.init_app(app)
    
    migrate.init_app(app, db)
    login_manager.init_app(app)
            
    from routes.friend import friends_bp
    from routes.user import user_bp

    app.register_blueprint(friends_bp)    
    app.register_blueprint(user_bp)
    
    
    

    return app

app = create_app()
sslify = SSLify(app)

CORS(app, supports_credentials=True) 
jwt = JWTManager(app)

socketio = SocketIO(app, cors_allowed_origins="*")

@app.after_request
def apply_cors(response):
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    expires = timedelta(days=3)
    access_token = create_access_token(identity="117797862331024228737", expires_delta=expires)

    print("Access token Bearer",access_token)
    
    return response

@socketio.on("connect")
def on_connect(auth):
    sid = request.sid
    token: str = auth['Authorization']
    user_id = decode_token(token.replace('Bearer ',''))['sub']

    _user_id_to_sid[user_id] = sid
    _sid_to_user_id[sid] = user_id   
    
    user = User.query.get(user_id)
    
    user.status = "online"
    
    db.session.commit()

@socketio.on("chat")
def on_join_room(data):
    message = data["message"]
    user_id = _sid_to_user_id[request.sid]
    
    user = User.query.get(user_id)

    emit("on-chat", {'message': message, 'user_id': user.id, 'avatar': user.avatar, 'name': user.name}, broadcast=True)

@socketio.on("reject")
def on_join_room(data):
    room_id = data["room_id"]

    emit("call-rejected", broadcast=True, room=room_id)


@socketio.on("join-room")
def on_join_room(data):
    sid = request.sid
    room_id = data["room_id"]
    
    user_id = _sid_to_user_id[sid]
    
    user = User.query.get(user_id)
    
    _room_of_sid[sid] = room_id
    _name_of_sid[sid] = user.name
        
    if (room_id != user.id):
        isFriend = Friend.query.filter( (Friend.user_id == room_id) & (Friend.friend_id == user_id) |
        (Friend.user_id == user_id) & (Friend.friend_id == room_id)).first() is not None
    
        if (not isFriend):
            emit("not-friend")
            

    join_room(room_id)


    emit("user-connect", {"name": user.name,"id": user_id}, broadcast=True, room=room_id)
    # broadcast to others in the room    
    # add to user list maintained on server
    if room_id not in _users_in_room:
        _users_in_room[room_id] = {user_id}
        emit("user-connect", {"name": user.name,"id": user_id})
        print("\nuser ", _name_of_sid[ _user_id_to_sid[ user_id]]," joined room " , _name_of_sid[_user_id_to_sid[room_id]], "\n")
    else:        
        if user_id not in _users_in_room[room_id]:
            _users_in_room[room_id].add(user_id) # add new member to user list maintained on server
            print("\nuser ", _name_of_sid[ _user_id_to_sid[ user_id]]," joined room " , _name_of_sid[ _user_id_to_sid[ room_id]], "\n")

    emit("enter-call", {"sid": sid, "name": user.name,"id": user_id }, include_self=False, room=room_id)
    
                    
    user_list = {user_id:  _name_of_sid[ _user_id_to_sid[user_id]] for user_id in _users_in_room[room_id]}
    emit("user-list", {"list": user_list}, broadcast=True,include_self=False, room=room_id) # send list of existing users to the new member



    
    if (room_id != user_id):
        emit("enter-call", {"sid": sid, "name": user.name,"id": user_id }, include_self=False, room=room_id)

            
    print("\nUsers in {}: {}".format(_name_of_sid[ _user_id_to_sid[ room_id]],[  _name_of_sid[ _user_id_to_sid[ u_id]] for u_id in _users_in_room[room_id]]), "\n")



@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    id = _sid_to_user_id[sid]
    
    user = User.query.get(id)
    
    user.status = "offline"
    
    db.session.commit()

    
    emit("user-disconnect", {"sid": sid, "id": id },include_self=False, broadcast=True, room=id)
    print("{}  left {}".format(_name_of_sid[_user_id_to_sid[ id]] ,_name_of_sid[_user_id_to_sid[id]]))
    

    leave_room(id)

    if id in _users_in_room:
        if id in _users_in_room[id]:
            _users_in_room[id].remove(id)
    
        print("\nUsers in room left {}: {} ".format(_name_of_sid[ _user_id_to_sid[id]], [_name_of_sid[ _user_id_to_sid[ u_id]] for u_id in _users_in_room[id]]), "\n")
        
        
        if len(_users_in_room[id]) == 0:
            _users_in_room.pop(id)


    if sid in _room_of_sid:
        _room_of_sid.pop(sid)
    

@socketio.on("leave-room")
def on_leave_room(data=None):
    sid = request.sid
    id = _sid_to_user_id[sid]

    if (data is None):
        room_id = _sid_to_user_id.get(sid)
    else:
        room_id = data['room_id']
        
    if (room_id is None):
        return
    
    emit("user-disconnect", {"sid": sid, "id": id },include_self=False, broadcast=True, room=room_id)
    print("{}  left {}".format(_name_of_sid[_user_id_to_sid[ id]] ,_name_of_sid[_user_id_to_sid[room_id]]))
    
    if (room_id == id):
        return
    

    leave_room(room_id)

    if room_id in _users_in_room:
        if id in _users_in_room[room_id]:
            _users_in_room[room_id].remove(id)
    
        print("\nUsers in room left {}: {} ".format(_name_of_sid[ _user_id_to_sid[room_id]], [_name_of_sid[ _user_id_to_sid[ u_id]] for u_id in _users_in_room[room_id]]), "\n")
        
        
        if len(_users_in_room[room_id]) == 0:
            _users_in_room.pop(room_id)


    if sid in _room_of_sid:
        _room_of_sid.pop(sid)
    

@socketio.on("data")
def on_data(data):
    
    sid = request.sid
    
    sender_id = data['sender_id']
    target_id = data['target_id']
    id = data['id']
    
    user_id = _sid_to_user_id[sid]
    
    if sender_id != user_id:
        print("[Not supposed to happen!] request.user_id :{} and sender_id: {} don't match!!!".format(user_id, sender_id))
    

    if data["type"] != "new-ice-candidate":
        print('\nid: {} => {} message from {} to {}\n'.format(id, data["type"], sender_id, target_id))


        
    socketio.emit('data', data,include_self=False, room=target_id)

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0",debug=True, port=8080)
