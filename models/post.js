var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, head, title, tags, post) {
    this.name = name;
    this.head = head;
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
        head: this.head,
        time: time,
        title: this.title,
        tags: this.tags,
        post: this.post,
        comments: [],
        reprint_info: {},
        pv: 0,
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
            // collection.update({
            //     name: name,
            //     'time.day': day,
            //     title: title
            // },
            // {
            //     $inc: {pv: 1},
            // },
            // function(err) {
            //     mongodb.close();
            //     if (err) {
            //         console.log('error1');
            //         return cb(err.message);
            //     }
            // })

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
// Post.remove = function(name, day, title, callback) {
//     //打开数据库
//     mongodb.open(function (err, db) {
//       if (err) {
//         return callback(err.message);
//       }
//       //读取 posts 集合
//       db.collection('posts', function (err, collection) {
//         if (err) {
//           mongodb.close();
//           return callback(err.message);
//         }
//         //根据用户名、日期和标题查找并删除一篇文章
//         collection.remove({
//           "name": name,
//           "time.day": day,
//           "title": title
//         }, {
//         //   w: 1
//         justOne: 1,
//         }, function (err) {
//           mongodb.close();
//           if (err) {
//             return callback(err.message);
//           }
//           callback(null);
//         });
//       });
//     });
//   };

//删除一篇文章
Post.remove = function(name, day, title, callback) {
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
        //查询要删除的文档
        collection.findOne({
          "name": name,
          "time.day": day,
          "title": title
        }, function (err, doc) {
          if (err) {
            mongodb.close();
            return callback(err);
          }
          //如果有 reprint_from，即该文章是转载来的，先保存下来 reprint_from
          var reprint_from = "";
          if (doc.reprint_info.reprint_from) {
            reprint_from = doc.reprint_info.reprint_from;
          }
          if (reprint_from != "") {
            //更新原文章所在文档的 reprint_to
            collection.update({
              "name": reprint_from.name,
              "time.day": reprint_from.day,
              "title": reprint_from.title
            }, {
              $pull: {
                "reprint_info.reprint_to": {
                  "name": name,
                  "day": day,
                  "title": title
              }}
            }, function (err) {
              if (err) {
                mongodb.close();
                return callback(err);
              }
            });
          }
  
          //删除转载来的文章所在的文档
          collection.remove({
            "name": name,
            "time.day": day,
            "title": title
          }, {
            w: 1
          }, function (err) {
            mongodb.close();
            if (err) {
              return callback(err);
            }
            callback(null);
          });
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

  //返回通过标题关键字查询的所有文章信息
Post.search = function(keyword, callback) {
    mongodb.open(function (err, db) {
      if (err) {
        return callback(err.message);
      }
      db.collection('posts', function (err, collection) {
        if (err) {
          mongodb.close();
          return callback(err.message);
        }
        var pattern = new RegExp(keyword, "i");
        collection.find({
          "title": pattern
        }, {
          "name": 1,
          "time": 1,
          "title": 1
        }).sort({
          time: -1
        }).toArray(function (err, docs) {
          mongodb.close();
          if (err) {
           return callback(err.message);
          }
          callback(null, docs);
        });
      });
    });
  };

  // 转诊一篇文章

  Post.reprint = function(reprint_from, reprint_to, cb) {
      mongodb.open(function(err, db) {
          if (err) {
              return cb(err.message);
          }
          db.collection('posts', function(err, collection) {
              if (err) {
                  mongodb.close();
                  return cb(err.message);
              }
              collection.findOne({
                  name: reprint_from.name,
                  'time.day': reprint_from.day,
                  title: reprint_from.title,
              }, function(err, doc) {
                  if (err) {
                      mongodb.close();
                      return cb(err.message);
                  }
                  var date = new Date();
                  var time = {
                    date: date,
                    year : date.getFullYear(),
                    month : date.getFullYear() + "-" + (date.getMonth() + 1),
                    day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
                    minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
                    date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
                }
                delete doc._id;
                doc.name = reprint_to.name;
                doc.head = reprint_to.head;
                doc.time = time;
                doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title : "[转载]" + doc.title;
                doc.comments = [];
                doc.reprint_info = {"reprint_from": reprint_from};
                doc.pv = 0;

                // // 更新被转载的原文档的reprint_info内的reprint_info
                // collection.update({
                //         name: reprint_from.name,
                //         'time.day': reprint_from.day,
                //         title: reprint_from.title,
                //     },
                //     {
                //         $push: {
                //             "reprint_info": {
                //                 name: doc.name,
                //                 'time.day': time.day,
                //                 title: doc.title,
                //             },
                //         }    
                //     },
                //     function (err) {
                //         if (err) {
                //             mongodb.close();
                //             return cb(err.message);
                //         }
                //     }
                // )

                // 将转诊生成的副本修改后存入数据库，并返回存储后的文档
                collection.insert(doc, {
                    safe: true,
                }, function(err, post) {
                    mongodb.close();
                    if (err) {
                        return cb(err.message);
                    }
                    cb(null, post[0]);
                })
              })
          })
      })
  }