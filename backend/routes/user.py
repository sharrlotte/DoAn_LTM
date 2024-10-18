
from datetime import timedelta
from flask import  Blueprint, request, jsonify, redirect
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
import urllib.parse
import os
from schema.friend import Friend
from schema.user import User
from shared import db
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required


CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

user_bp = Blueprint('users', __name__)

@user_bp.route('/')
def home():
    return "Welcome to the Google Login API"

@user_bp.route('/auth/login')
def videocall_login():
    redirect_uri = 'http://localhost:8080/callback'
    scope = 'openid email profile'

    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        "response_type=code&"
        f"scope={urllib.parse.quote(scope)}&"
        "access_type=offline"
    )
    
    return redirect(google_auth_url)

@user_bp.route('/callback')
def callback():
    code = request.args.get('code')

    if not code:
        return "Authorization code is missing", 400

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        'code': code,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': 'http://localhost:8080/callback',
        'grant_type': 'authorization_code'
    }

    response = requests.post(token_url, data=data)

    if response.status_code != 200:
        return "Failed to obtain tokens", response.status_code

    tokens = response.json()
    id_token_received = tokens.get('id_token')

    idinfo = id_token.verify_oauth2_token(id_token_received, google_requests.Request(), CLIENT_ID, clock_skew_in_seconds=10)
    user_id = idinfo['sub']
    email = idinfo['email']
    name = idinfo['name']
    avatar = idinfo['picture']

    user = User(id=user_id, email=email, name=name, avatar=avatar)
    
    db.session.merge(user)  
    db.session.commit()
    
    expires = timedelta(days=3)
    access_token = create_access_token(identity=user.id, expires_delta=expires)

    return redirect(os.getenv('FRONTEND_APP_URL') +"/auth" + "?accessToken=" + access_token)

@user_bp.route('/auth/session', methods=['GET'])
@jwt_required()
def get_session():       

    id = get_jwt_identity()
    user: User = User.query.get(id)
    
    if not user is None:
        return jsonify({'id': user.id, "name": user.name,"avatar": user.avatar }), 200
    
    return {} ,200
    

@user_bp.route('/users', methods=['GET'])
@jwt_required()
def find_user():
    name = request.args.get('name','', type=str)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    id = get_jwt_identity()
    
    friend_ids = db.session.query(Friend.friend_id).filter(Friend.user_id == id).subquery()

    # Build the main user query with filtering and excluding friends
    users_query = User.query.filter(
        User.id != id,  # Exclude the current user
        ~User.id.in_(friend_ids)  # Exclude friends
    )

    # Apply name filtering if provided
    if name:
        users_query = users_query.filter(User.name.ilike(f'%{name}%'))

    # Paginate the query
    paginated_users = users_query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'total': paginated_users.total,
        'page': paginated_users.page,
        'per_page': paginated_users.per_page,
        'users': [{'user_id': user.id, 'name': user.name,'avatar': user.avatar} for user in paginated_users.items]
    })
