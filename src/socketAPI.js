var fs = require("fs");
var ss = require("socket.io-stream");
var Directory = require("../model/directory");
var async = require("async");
var mime = require("mime-types");
const SocketIOFile = require("socket.io-file");

module.exports = function(io) {
  io.on("connection", socket => {
    socket.on("startUpload", function(file) {
      //vytvory novy zaznam v scheme pre suvbory
      //zada jej velkost aj to ze este nie je uplne uploadnuty
      //pri ukonceni uploadovania sa tento parameter odsranu (vdaka nemu bude mozne pokracovat v nahrávaní a roztriedit subbory podla
      // ci su uplne uploadnute)

      async.waterfall(
        [
          // nájde priečinok v databáze
          function(done) {
            Directory.findOne(
              { _id: socket.request.session.workingDirectory },
              function(err, directory) {
                if (err) {
                  return done(err);
                } else if (directory) {
                  return done(false, directory);
                }
              }
            );
          },

          // overí či už neexistuje subor v databaze
          function(directory, done) {
            for (var i = 0; i < directory.files.length; i++) {
              if (directory.files[i].name == file.name) {
                return done(false, directory, true);
              }
            }
            return done(false, directory, false);
          },

          function(directory, fileInDBExists, done) {
            fs.stat(directory.path + file.name, function(err, stat) {
              if (err == null) {
                return done(false, directory, true, fileInDBExists);
              } else if (err.code == "ENOENT") {
                return done(false, directory, false, fileInDBExists);
              } else {
                return done(true);
              }
            });
          },
          //skontroluje či sa subor nachádza v databáze a ak nie tak ho pridá
          function(directory, fileExists, fileInDBExists, done) {
            if (!fileExists && !fileInDBExists) {
              directory.files.push({ name: file.name, notFullyUploaded: true });
              return done(false, directory, false, false);
            } else if (fileExists && !fileInDBExists) {
              directory.files.push({
                name: file.name,
                notFullyUploaded: false
              });
              return done(false, directory, false, false);

              //socket send to inform that file allready existrs
            } else if (!fileExists && fileInDBExists) {
              for (var i = 0; i < directory.files.length; i++) {
                if (directory.files[i].name == file.name) {
                  directory.files.splice(i, 1);
                  return done(false, directory, false, false);
                }
              }
            } else {
              for (var i = 0; i < directory.files.length; i++) {
                if (directory.files[i].name == file.name) {
                  if (directory.files[i].notFullyUploaded) {
                    return done(false, directory, true, false);
                  }
                }
              }
              return done(true, "File allready exists");
            }
          },

          function(directory, fileExists, fileInDBExists, done) {
            if (!fileInDBExists) {
              directory.save(function(err) {
                if (err) {
                  return done(
                    err,
                    "unable to save file in directory in startUpload | socketAPI"
                  );
                } else {
                  return done(false, directory, fileExists);
                }
              });
            } else {
              return done(false, directory, fileExists);
            }
          },

          // pridá súbor do databazy priecinkov, pošle požiadavku na začatie posielania dát,
          // uloží do sessionu správu o tom aké súbory sa uploaduju a ich cestu
          function(directory, fileExists, done) {
            if (!socket.request.session.uploadFiles) {
              socket.request.session.uploadFiles = [];
            }
            socket.request.session.uploadFiles.push({
              name: file.name,
              path: directory.path
            });

            if (!fileExists) {
              socket.emit("sendData", { name: file.name, position: 0 });
            } else if (fileExists) {
              fs.stat(directory.path + "/" + file.name, function(err, stat) {
                if (err) {
                  return done(
                    err,
                    "unable to find stat insfo in startUpload | socketAPI"
                  );
                } else if (!stat) {
                  return done(
                    true,
                    "no stat object in startUpload | socketAPI"
                  );
                } else {
                  socket.emit("sendData", {
                    name: file.name,
                    position: stat.size
                  });
                }
              });
            }
          }
        ],
        function(err, error) {
          socket.emit(
            "errorLog",
            "Pri inicializovaní nahrávania súborov nastala chyba"
          );
        }
      );
    });

    // socket io stream listener pre upload suborov cez streamy
    ss(socket).on("uploadData", function(stream, file) {
      async.waterfall(
        [
          function(done) {
            files = socket.request.session.uploadFiles;
            for (var i = 0; i < files.length; i++) {
              if (files[i].name == file.name) {
                return done(false, files[i]);
                socket.request.session.uploadFiles.splice(i, 1);
              }
            }

            return done(true);
          },
          function(oneOfFiles, done) {
            if (file.start == 0) {
              var writeStream = fs.createWriteStream(
                oneOfFiles.path + file.name,
                { flags: "w+", start: file.start }
              );
              stream.pipe(writeStream);
            } else {
              var writeStream = fs.createWriteStream(
                oneOfFiles.path + file.name,
                { flags: "a", start: file.start }
              );
              stream.pipe(writeStream);
            }
            writeStream.on("finish", function() {
              doneUploading(socket.request.session.workingDirectory, file.name);
            });
            //writeStream.write("file")
          }
        ],
        function(err, message) {
          scoket.emit("errorLog", "Počas nahrávania súborov nastala chyba.");
        }
      );
    });

    ss(socket).on("download", function(stream, file) {
      async.waterfall(
        [
          function(done) {
            Directory.findOne(
              { _id: socket.request.session.workingDirectory },
              function(err, directory) {
                if (err) {
                  return done(err);
                } else if (directory) {
                  return done(false, directory);
                }
              }
            );
          },

          function(directory, done) {
            for (var i = 0; i < directory.files.length; i++) {
              if (directory.files[i].name == file.name) {
                if (!directory.files[i].notFullyUploaded) {
                  return done(false, directory);
                } else {
                  return done(true, "Súbor nie je plne nahraný");
                }
              }
            }
            return done(true, "Pri sťahovaní súboru nastala chyba");
          },

          function(directory, done) {
            var myStream = fs.createReadStream(directory.path + file.name);
            myStream.pipe(stream);
          }
        ],
        function(err, message) {
          socket.emit("errorLog", message);
        }
      );
    });

    socket.on("deleteFile", function(data) {
      async.waterfall(
        [
          // vyhladá pracovný priečinok
          function(done) {
            Directory.findOne(
              { _id: socket.request.session.workingDirectory },
              function(err, directory) {
                if (err) {
                  return done(
                    err,
                    "Unable to find working directory in deleteFile | socketAPI"
                  );
                } else if (directory) {
                  return done(false, directory);
                }
              }
            );
          },

          //overí čí sa súbr nachádza v pracovnom priečinku
          function(directory, done) {
            files = directory.files;
            for (var i = 0; i < files.length; i++) {
              if (files[i].name == data.name) {
                return done(false, directory, i);
              }
            }
            return done(true, "No such file in directory");
          },

          //overí či sa súbor nachádza v súborovom systéme
          function(directory, index, done) {
            fs.unlink(
              directory.path + "/" + directory.files[index].name,
              function(err) {
                if (err) {
                  //vypíše chybovú hlášku (v pripade ak subor vo FS neexistuje) ale waterfall pokračuje aby sa subor vymazal z databázy
                  //   console.log(err);
                  //   console.log(
                  //     "unable to unlink file from fileSystem in deleteFile | socketAPI"
                  //   );
                  //pokračovanie waterfallu
                  return done(false, directory, index);
                } else {
                  return done(false, directory, index);
                }
              }
            );
          },

          //vymaže zaznam o subore z databázy
          function(directory, index, done) {
            directory.files.splice(index, 1);
            directory.save(function(err) {
              if (err) {
                return done(
                  err,
                  "unable to save directory in deleteFIle | socketAPI"
                );
              }
              socket.emit("deleteFileReturn");
            });
          }
        ],
        function(err, message) {
          socket.emit("errorLog", "Pri vymazávaní súboru nastala chyba");
        }
      );
    });

    //#######################################################################################
    // 										lsFiles
    //#######################################################################################

    socket.on("lsFiles", function(data = {}) {
      async.waterfall(
        [
          function(done) {
            var workingDirectory = socket.request.session.workingDirectory;
            Directory.findOne({ _id: workingDirectory }, function(
              err,
              directory
            ) {
              if (err) {
                return done(true);
              } else if (!directory) {
                return done(true);
              } else {
                return done(false, directory);
              }
            });
          },

          function(directory, done) {
            var fileNames = new Array();
            if (data.category) {
              for (var i = 0; i < directory.files.length; i++) {
                if (directory.files[i].category == data.category) {
                  fileNames.push(directory.files[i].name);
                }
              }
            } else {
              for (var i = 0; i < directory.files.length; i++) {
                fileNames.push(directory.files[i].name);
              }
            }
            return done(false, fileNames);
          },

          function(fileName, done) {
            var files = new Array();
            for (var i = 0; i < fileName.length; i++) {
              files.push({
                name: fileName[i],
                type: mime.lookup(fileName[i])
              });
            }
            return done(false, files);
          },

          function(files, done) {
            socket.emit("lsFilesReturn", files);
          }
        ],
        function(err) {}
      );
    });

    //#######################################################################################
    // 									lsDirectories
    //#######################################################################################

    socket.on("lsDirectories", function(data = {}) {
      async.waterfall(
        [
          function(done) {
            var workingDirectory = socket.request.session.workingDirectory;
            Directory.findOne({ _id: workingDirectory }, function(
              err,
              directory
            ) {
              if (err) {
                return done(true);
              } else if (!directory) {
                return done(true);
              } else {
                return done(false, directory);
              }
            });
          },

          function(directory, done) {
            var directoryNames = new Array();
            if (data.category) {
              for (var i = 0; i < directory.nestedDirectories.length; i++) {
                if (data.category == directory.nestedDirectories[i].category) {
                  directoryNames.push(directory.nestedDirectories[i].name);
                }
              }
            } else {
              for (var i = 0; i < directory.nestedDirectories.length; i++) {
                directoryNames.push(directory.nestedDirectories[i].name);
              }
            }
            return done(false, directoryNames);
          },

          function(directoryNames, done) {
            socket.emit("lsDirectoriesReturn", directoryNames);
          }
        ],
        function(err) {
          socket.emit(
            "errorLog",
            "Nepodarilo sa načítať priečinky, skúste reštartovať stránku"
          );
        }
      );
    });

    //#######################################################################################
    // 										createDirectory
    //#######################################################################################

    socket.on("createNewDirectory", function(data) {
      var workingDirectory = socket.request.session.workingDirectory;

      async.waterfall(
        [
          //skontroluje, či pracovný priečinok užívateľa existuje
          function(done) {
            Directory.findOne({ _id: workingDirectory }, function(
              err,
              directory
            ) {
              if (err) {
                return done(true);
              } else if (!directory) {
                return done(true);
              } else {
                return done(false, directory);
              }
            });
          },

          //vytvorí objekt newDirectory
          function(directory, done) {
            var newDirectory = new Directory();

            newDirectory.name = data.name;
            newDirectory.path = directory.path + data.name + "/";
            newDirectory.parentDirectoryPath = directory.path;

            return done(false, directory, newDirectory);
          },

          //vytvorý súbor zodpovedajúci objektu newDirecotrx
          function(directory, newDirectory, done) {
            fs.mkdir(newDirectory.path, function(err) {
              if (err) {
                return done(true, err);
              }
              return done(false, directory, newDirectory);
            });
          },

          //uloží objekt newDirectory do databázy
          function(directory, newDirectory, done) {
            newDirectory.save(function(err, newDirectory) {
              if (err) {
                var errorIn = "saveNewDirectory";
                return done(true, errorIn, directory, newDirectory);
              }
              return done(false, directory, newDirectory);
            });
          },

          //obnoví dokument rodičovského súboru v databáze
          function(directory, newDirectory, done) {
            directory.nestedDirectories.push({
              name: data.name,
              _id: newDirectory._id
            });

            directory.save(function(err) {
              if (err) {
                var errorIn = "saveDirectory";
                return done(true, errorIn, directory, newDirectory);
              }
              socket.emit("createNewDIrectoryReturn");
              return done(false);
            });
          },

          function(done) {
            socket.emit("createNewDIrectoryReturn");
          }

          //funkcia na spracovanie chýb a ich opravu
        ],
        function(err, errorIn, directory, newDirectory) {
          if (errorIn == "saveNewDirectory") {
            fs.rmdir(newDirectory.path, function(err) {
              if (err) {
                //unable to remove directory from fs
              }
            });
          } else if (errorIn == "saveDirectory") {
            fs.rmdir(newDirectory.path, function(err) {
              if (err) {
                //unable to remove directory from fs
              } else {
                Directory.remove({ _id: newDirectory._id }, function(err) {
                  if (err) {
                    //unable to remove directory from db
                  }
                });
              }
            });
          }
        }
      );
    });

    socket.on("openDirectory", function(data) {
      var workingDirectory = socket.request.session.workingDirectory;
      async.waterfall(
        [
          //skontroluje, či pracovný priečinok užívateľa existuje
          function(done) {
            console.log("1");
            Directory.findOne(
              {
                $and: [
                  { _id: socket.request.session.workingDirectory },
                  { "nestedDirectories.name": data.name }
                ]
              },
              function(err, directory) {
                if (err) {
                  return done(true);
                } else if (!directory) {
                  return done(true);
                } else {
                  return done(false, directory);
                }
              }
            );
          },

          function(directory, done) {
            var idOfDirectory = directory.nestedDirectories.filter(function(
              elements
            ) {
              return elements.name == data.name;
            })[0]._id;

            socket.request.session.workingDirectory = idOfDirectory;
            socket.emit("openDirectoryReturn");
          }
        ],
        function(err) {
          console.log("error in openDirectory | socketAPI");
        }
      );
    });

    socket.on("returnToUpperDirectory", function() {
      var workingDirectory = socket.request.session.workingDirectory;

      async.waterfall(
        [
          function(done) {
            Directory.findOne({ _id: workingDirectory }, function(
              err,
              directory
            ) {
              if (err) {
                return done(true);
              } else if (!directory) {
                return done(true);
              } else {
                return done(false, directory);
              }
            });
          },

          function(directory, done) {
            Directory.findOne({ path: directory.parentDirectoryPath }, function(
              err,
              dir
            ) {
              if (dir) {
                socket.request.session.workingDirectory = dir._id;
                socket.emit("returnToUpperDirectoryReturn");
              } else {
                return done(true);
              }
            });
          }
        ],
        function(err) {
          //socket.emit("errorLog", "Nepodarilo sa vrátiť")
          //console.log("error in returnToUpperDirectory | socktAPI");
        }
      );
    });

    socket.on("addFileToCategory", function(data) {
      async.waterfall(
        [
          function(done) {
            var workingDirectory = socket.request.session.workingDirectory;
            Directory.findOne({ _id: workingDirectory }, function(
              err,
              directory
            ) {
              if (err) {
                return done(true);
              } else if (!directory) {
                return done(true);
              } else {
                return done(false, directory);
              }
            });
          },
          function(directory, done) {
            files = directory.files;
            for (var i = 0; i < files.length; i++) {
              if (files[i].name == data.name) {
                return done(false, directory, i);
              }
            }
            return done(true, "No such file in directory");
          },
          function(directory, i, done) {
            if (data.category) {
              directory.files[i].category = data.category;
              return done(false, directory);
            }
            return done(
              true,
              "Category is not defined in data in addFileToCategory | socketAPI"
            );
          },
          function(directory, done) {
            directory.save(function(err) {
              if (err) {
                return done(
                  err,
                  "unable to save directory in addFileToCategory | socketAPI"
                );
              }
              socket.emit("addFileToCategoryReturn");
            });
          }
        ],
        function(err, message) {
          socket.emit("errorLog", "Nepodarilo sa pridať súbor do kategórie");
        }
      );
    });

    socket.on("addDirectoryToCategory", function(data = {}) {
      async.waterfall(
        [
          function(done) {
            var workingDirectory = socket.request.session.workingDirectory;
            Directory.findOne({ _id: workingDirectory }, function(
              err,
              directory
            ) {
              if (err) {
                return done(true);
              } else if (!directory) {
                return done(true);
              } else {
                return done(false, directory);
              }
            });
          },
          function(directory, done) {
            nestedDirectories = directory.nestedDirectories;
            for (var i = 0; i < nestedDirectories.length; i++) {
              if (nestedDirectories[i].name == data.name) {
                return done(false, directory, i);
              }
            }
            return done(true, "No such directory");
          },
          function(directory, i, done) {
            if (data.category) {
              directory.nestedDirectories[i].category = data.category;
              return done(false, directory);
            }
            return done(
              true,
              "Category is not defined in data in addFileToCategory | socketAPI"
            );
          },
          function(directory, done) {
            directory.save(function(err) {
              if (err) {
                return done(
                  err,
                  "unable to save directory in addFileToCategory | socketAPI"
                );
              }
              socket.emit("addDirectoryToCategoryReturn");
            });
          }
        ],
        function(err, message) {
          socket.emit("errorLog", "Nepodarilo sa pridať súbor do kategórie");
        }
      );
    });
  });

// update file state in db to fully uploaded
function doneUploading(id, name) {
  async.waterfall([
    function(done) {
      Directory.findOne({ _id: id }, function(err, directory) {
        if (directory) {
          return done(false, directory);
        } else {
          return done(true, err);
        }
      });
    },

    function(directory, done) {
      for (var i = 0; i < directory.files.length; i++) {
        if (directory.files[i].name == name) {
          return done(false, directory, i);
        }
      }
      return done(true, "No such file in directory");
    },

    function(directory, index, done) {
      directory.files[index].notFullyUploaded = false;
      return done(false, directory);
    },

    function(directory, done) {
      directory.save(function(err) {});
    }
  ])
}
}

