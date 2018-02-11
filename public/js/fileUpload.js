var socket = io();
var body = document.getElementById("wrap");

var fileArray = [];


body.addEventListener("dragover", function(event) {
    event.preventDefault();
}, false);

body.addEventListener("drop", function(event) {
    event.preventDefault();
    files = event.dataTransfer.files;
    fileArray = [];

    for (var i=0; i<files.length; i++) {
        fileArray.push({ name: files[i].name, data: files[i] });
        socket.emit("startUpload", {name: files[i].name});
    }
}, false);

 socket.on("sendData", function(data) {
    console.log("position" + data.position);
    var stream = ss.createStream();
    for (var i=0; i<fileArray.length; i++) {
        if (fileArray[i].name == data.name) {
            var file = fileArray[i].data;

            console.log(file);
            console.log(file.size);
            var position = 0;
           // var difference = file.size / 10;
            ss(socket).emit('uploadData', stream, {name: file.name, size: file.size, start: data.position});
            var blobStream = ss.createBlobReadStream(file.slice(data.position));
            
            var size = 0
            blobStream.on("data", function(chunk) {
                size += chunk.length;
                if (size == file.size) {
                    console.log("uploaded");
                    socket.emit("lsFiles");
                }
            });

            blobStream.pipe(stream);
            
           /*
            do {
                if ((file.size - position) >= difference ) {
                    var slice = file.slice(position, position + difference);

                    ss(socket).emit('uploadData', stream, {size: slice.size});
                    ss.createBlobReadStream(slice).pipe(stream);
 


                   // socket.emit("uploadData", {name: file.name, data: slice});
                    position += difference;
                }
                else {
                    var slice = file.slice(position, file.size);
                    ss(socket).emit('uploadData', stream, {size: slice.size});
                    ss.createBlobReadStream(slice).pipe(stream);
                    //socket.emit("uploadData", {name: file.name, data: slice});
                    position = file.size;
                }
            } while (position < file.size); */
            
           // var file = ss.Buffer.from(file);


//            socket.emit("endUpload");

            break;
        }
    }

});

function uploadData(name, data) {
    socket.emit("uploadData", {name: name, data: data});
}

function initiateUpload(name, data) {
    socket.emit("startUpload", {name: name, data: data});
}

function onStart(position, name, data, initiate, upload) {
    if (position == 0) {
        initiate(name, data);
    }
    else {
        upload(name, data);
    }
}
