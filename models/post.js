var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, title, tags, post) {
    this.name = name;
    this.title = title;
    this.tags = tags;
    this.post = post;
};

module.exports = Post;

// 存储一篇文章及其相关信息
Post.prototype.save = function(cb) {
    var date = new Date();
    var time = {
        date: date,
        year : date.getFullYear(),
        month : date.getFullYear() + "-" + (date.getMonth() + 1),
        day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
        date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) 
    }
    // 要存入数据库的文档
    var post = {
        name: this.name,
        time: time,
        title: this.title,
        tags: this.tags,
        post: this.post,
        comments: [],
    }
    // 打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return cb(err.message);
        }
        // 读取posts集合
        mongodb.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return cb(err.message); 
            }
           collection.insert(post, {
               safe: true,
           }, function(err) {
               mongodb.close();
               if (err) {
                   return cb(err.message);
               }
               cb(null);
           })
        })
    })
};

Post.getTen = function(name, page, cb) {
    mongodb.open(function(err, db) {
        if (err) {
            return cb(err.message);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return cb(err.message);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            collection.count(query, function(err, total) {
                // 根据query对象查询，并跳过前（page -1）*10个结果，返回之后的十个结果
                collection.find(query, {
                    skip: (page -1) * 10,
                    limit: 10
                }).sort({
                    time: -1,
                }).toArray(function(err, docs) {
                    mongodb.close();
                    if (err) {
                        return cb(err.message);
                    }
                    docs.forEach(function(doc) {
                        if (doc.post) {
                            doc.post = markdown.toHTML(doc.post);
                        }
                    })
                    cb(null, docs, total);
                })
            });
        })
    })
};

// 获取一篇文章
Post.getOne = function(name, day, title, cb) {
    mongodb.open(function(err, db) {
        if (err) {
            // mongodb.close(); 打开时报错，表示没打开
            return cb(err.message);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return cb(err.message);
            }
            // 根据用户名，发布日期及文章名进行查询
            collection.findOne({
                name: name,
                'time.day': day,
                title: title
            }, function(err, doc) {
                mongodb.close();
                if (err) {
                    return cb(err.message);
                }
                doc.comments = doc.comments || [];
                if (doc) {
                    doc.post = markdown.toHTML(doc.post);
                    doc.comments.forEach(function(comment) {
                        comment.content = markdown.toHTML(comment.content);
                    })
                }
                cb(null, doc);
            })
        })
    })
}

// 返回原始发表的内容（markdown 格式)
Post.edit =  function(name, day, title, cb) {
    mongodb.open(function(err, db) {
        if (err) {
            return cb(err.message);
        }
        db.collection("posts", function(err, collection) {
            if (err) {
                mongodb.close();
                return cb(err.message);
            }
            console.log(name,day,title);
            collection.findOne({
                name: name,
                "time.day": day,
                title: title,
            }, function(err, doc) {
                mongodb.close();
                if (err) {
                    return cb(err.message);
                }
                console.log(doc);
                cb(null, doc);//返回查询的一篇文章（markdown 格式）
            })
        })
    })
}

 // 更新一篇文章及其相关内容
Post.update = function(name, day, title, post, cb) {
    mongodb.open(function(err, db) {
        if (err) {
            return cb(err.message);
        }
        db.collection('posts', function(err, collection){
            if (err) {
                mongodb.close();
                return cb(err.message);
            }
            var params = {
                name: name,
                'time.day': day,
                title: title,
            };
            collection.update(params,
                {
                    $set: {post: post}
                },
                function(err) {
                    mongodb.close();
                    if (err) {
                        return cb(err.message);
                    }
                    cb(null);
                }
            )
        })
    })
}

//删除一篇文章
Post.remove = function(name, day, title, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
      if (err) {
        return callback(err.message);
      }
      //读取 posts 集合
      db.collection('posts', function (err, collection) {
        if (err) {
          mongodb.close();
          return callback(err.message);
        }
        //根据用户名、日期和标题查找并删除一篇文章
        collection.remove({
          "name": name,
          "time.day": day,
          "title": title
        }, {
        //   w: 1
        justOne: 1,
        }, function (err) {
          mongodb.close();
          if (err) {
            return callback(err.message);
          }
          callback(null);
        });
      });
    });
  };

  //返回所有文章存档信息
Post.getArchive = function(callback) {
    //打开数据库
    mongodb.open(function (err, db) {
      if (err) {
        return callback(err);
      }
      //读取 posts 集合
      db.collection('posts', function (err, collection) {
        if (err) {
          mongodb.close();
          return callback(err);
        }
        //返回只包含 name、time、title 属性的文档组成的存档数组
        collection.find({}, {
          "name": 1,
          "time": 1,
          "title": 1
        }).sort({
          time: -1
        }).toArray(function (err, docs) {
          mongodb.close();
          if (err) {
            return callback(err);
          }
          callback(null, docs);
        });
      });
    });
  };

//返回所有标签
Post.getTags = function(callback) {
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //distinct 用来找出给定键的所有不同值
      collection.distinct("tags", function (err, docs) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null, docs);
      });
    });
  });
};

//返回含有特定标签的所有文章
Post.getTag = function(tag, callback) {
    mongodb.open(function (err, db) {
      if (err) {
        return callback(err);
      }
      db.collection('posts', function (err, collection) {
        if (err) {
          mongodb.close();
          return callback(err);
        }
        //查询所有 tags 数组内包含 tag 的文档
        //并返回只含有 name、time、title 组成的数组
        collection.find({
          "tags": tag
        }, {
          "name": 1,
          "time": 1,
          "title": 1
        }).sort({
          time: -1
        }).toArray(function (err, docs) {
          mongodb.close();
          if (err) {
            return callback(err);
          }
          callback(null, docs);
        });
      });
    });
  };