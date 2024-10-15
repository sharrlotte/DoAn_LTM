from extentions import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, nullable=False)

    def __init__(self,id, email,name):
        self.id = id
        self.email = email
        self.name = name
    
    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
