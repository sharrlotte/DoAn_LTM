from dotenv import load_dotenv
import os

from flask_socketio import SocketIO
from shared import db, migrate, login_manager
from flask import Flask
from flask_cors import CORS
from flask_session import Session

load_dotenv()

SESSION_TYPE = 'filesystem'

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DB_CONNECTION")

    app.secret_key = os.getenv("SECRET_KEY")

    db.init_app(app)
    
    migrate.init_app(app, db)
    login_manager.init_app(app)
            
    from routes.friend import friends_bp
    from routes.user import user_bp

    app.register_blueprint(friends_bp)    
    app.register_blueprint(user_bp)
    
    
    

    return app

app = create_app()
app.config.from_object(__name__)

CORS(app) 
Session(app)

socketio = SocketIO(app, cors_allowed_origins="*")
    
from flask import  request, session
from flask_socketio import emit, join_room

from shared import _users_in_room, _room_of_sid, _name_of_sid



@app.post("/room")
def entry_checkpoint():
    room_id = request.form['room_id']
    name = request.form['name']
    session[room_id] = { "name": name}
    session.permanent = True
    session.modified = True

    return "Success"    


@socketio.on("connect")
def on_connect():
    sid = request.sid
    print("New socket connected ", sid)
    

@socketio.on("join-room")
def on_join_room(data):
    sid = request.sid
    room_id = data["room_id"]
    
    _room_of_sid[sid] = room_id
    _name_of_sid[sid] = room_id
    
    
    
    # broadcast to others in the room
    print("[{}] New member joined: {}<{}>".format(room_id, room_id, sid))
    
    # add to user list maintained on server
    if room_id not in _users_in_room:
        _users_in_room[room_id] = [sid]
        emit("user-list", {"my_id": sid}) # send own id only
    else:
        if sid not in _users_in_room[room_id]:
            usrlist = {u_id: _name_of_sid[u_id] for u_id in _users_in_room[room_id]}
            emit("user-list", {"list": usrlist, "my_id": sid}) # send list of existing users to the new member
            _users_in_room[room_id].append(sid) # add new member to user list maintained on server
        
    # register sid to the room
    join_room(room_id)
    
    emit("user-connect", {"sid": sid, "name": room_id}, broadcast=True, include_self=False, room=room_id)

    print("\nusers: ", _users_in_room, "\n")


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    room_id = _room_of_sid.get(sid)
    
    if (room_id is None):
        return
    
    name = _name_of_sid.get(sid)

    print("[{}] Member left: {}<{}>".format(room_id, name, sid))
    emit("user-disconnect", {"sid": sid}, broadcast=True, include_self=False, room=room_id)

    
    if sid in _users_in_room[room_id]:
        _users_in_room[room_id].remove(sid)
    
    if len(_users_in_room[room_id]) == 0:
        _users_in_room.pop(room_id)

    _room_of_sid.pop(sid)
    _name_of_sid.pop(sid)

    print("\nusers: ", _users_in_room, "\n")


@socketio.on("data")
def on_data(data):
    sender_sid = data['sender_id']
    target_sid = data['target_id']
    
    if sender_sid != request.sid:
        print("[Not supposed to happen!] request.sid and sender_id don't match!!!")

    if data["type"] != "new-ice-candidate":
        print('{} message from {} to {}'.format(data["type"], sender_sid, target_sid))
        
    socketio.emit('data', data, room=target_sid)

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0",debug=True, port=8080)
