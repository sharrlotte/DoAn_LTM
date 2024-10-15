from flask import Blueprint
from flask import  request, jsonify
from schema.friend import Friend
from extentions import db

friends_bp = Blueprint('friends', __name__)

@friends_bp.route('/friends', methods=['POST'])
def add_friend():
    user_id = request.json.get('user_id')
    friend_id = request.json.get('friend_id')

    if not user_id or not friend_id:
        return jsonify({'error': 'user_id and friend_id are required'}), 400

    existing_friend = Friend.query.filter_by(user_id=user_id, friend_id=friend_id).first()
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
def list_friends():
    user_id = request.args.get('user_id')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400

    friends_query = Friend.query.filter_by(user_id=user_id)
    paginated_friends = friends_query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'total': paginated_friends.total,
        'page': paginated_friends.page,
        'per_page': paginated_friends.per_page,
        'friends': [{'friend_id': friend.friend_id} for friend in paginated_friends.items]
    })


