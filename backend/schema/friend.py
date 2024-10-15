from flask import Blueprint
from extentions import db

class Friend(db.Model):
    __tablename__ = 'friends'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    friend_id = db.Column(db.String, nullable=False)

    def __repr__(self):
        return f"<Friend(user_id={self.user_id}, friend_id={self.friend_id})>"


