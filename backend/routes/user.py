
from flask import  Blueprint, request, jsonify, redirect
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
import urllib.parse
import os
from schema.user import User
from extentions import db

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

user_bp = Blueprint('users', __name__)

@user_bp.route('/')
def home():
    return "Welcome to the Google Login API"

@user_bp.route('/videocall/login')
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

    idinfo = id_token.verify_oauth2_token(id_token_received, google_requests.Request(), CLIENT_ID)
    user_id = idinfo['sub']
    email = idinfo['email']
    name = idinfo['name']

    user = User(id=user_id, email=email, name=name)
    db.session.merge(user)  
    db.session.commit()

    return jsonify(user.__repr__()), 200

@user_bp.route('/find_user', methods=['GET'])
def find_user():
    name = request.args.get('name')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    if not name:
        return jsonify({'error': 'Name parameter is missing'}), 400

    users_query = User.query.filter(User.name.ilike(f'%{name}%'))

    paginated_users = users_query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'total': paginated_users.total,
        'page': paginated_users.page,
        'per_page': paginated_users.per_page,
        'users': [{'user_id': user.id, 'name': user.name,} for user in paginated_users.items]
    })
