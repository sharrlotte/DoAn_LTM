from shared import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, nullable=False)
    avatar = db.Column(db.String, nullable=True)
    status = db.Column(db.String)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_authenticated= True

    def __init__(self,id, email,name, avatar):
        self.id = id
        self.email = email
        self.name = name
        self.avatar = avatar
        self.status = "offline"
    
    def as_dict(self):        
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
    
    def get_id(self):
        return self.id

# Update turn server
