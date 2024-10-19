from flask import Blueprint
from flask import  request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from schema.user import User
from schema.friend import Friend
from shared import db


friends_bp = Blueprint('friends', __name__)

@friends_bp.route('/friends', methods=['POST'])
@jwt_required()
def add_friend():
    
    user_id = get_jwt_identity()
    friend_id = request.json.get('friend_id')
    
    if user_id == friend_id: 
        return jsonify({'error': "Why are you so lonely, user_id and friend_id can be the same"})

    if not user_id or not friend_id:
        return jsonify({'error': 'user_id and friend_id are required'}), 400

    existing_friend = Friend.query.filter((Friend.user_id==user_id) & (Friend.friend_id==friend_id) | (Friend.friend_id==user_id) & (Friend.user_id==friend_id)).first()
    if existing_friend:
        return jsonify({'error': 'Friend already added'}), 400

    new_friend = Friend(user_id=user_id, friend_id=friend_id)
    db.session.add(new_friend)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add friend', 'details': str(e)}), 500

    return jsonify({'message': 'Friend added successfully', 'friend_id': friend_id}), 201

@friends_bp.route('/friends', methods=['GET'])
@jwt_required()
def list_friends():
    id = get_jwt_identity()
    user = User.query.get(id)
    
    user_id = user.id
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    friends_query = db.session.query(User).join(Friend, (Friend.user_id == User.id) & (Friend.friend_id == user_id) | (Friend.friend_id == User.id) & (Friend.user_id == user_id))\
                                    .paginate(page=page, per_page=per_page, error_out=False)

    friends = [{'id': friend.id, 'name': friend.name, 'avatar': friend.avatar} for friend in friends_query.items]

    return jsonify({
        'friends': friends,
        'page': page,
        'per_page': per_page,
        'total_friends': friends_query.total
    })


