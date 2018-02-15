var nameOfElement;

function lsFIles(category="") {
	if (category && category != "") {
		socket.emit("lsFiles", {"category": category});
	}
	else {
		socket.emit("lsFiles");
	}
}








function myFunction(x) {
	
	var $div = $("#mySidenav").css("width");
    x.classList.toggle("change");
    	
	if ($div == "0px") {
		$("#mySidenav").css("width","250px");
	}

	else {
		$("#mySidenav").css("width","0px");
	}
}





function showWindow(type){
	console.log(type);
	if (type == "directory") {
		$("#createDirectory").css("display","block");
	}

	else {
		$("#addFile").css("display","block");
	}
}

function hideWindow(){
	$("#createDirectory").css("display","none");
	$("#addFile").css("display","none");
}


function minimalize(){
	if ($(".indicatorArea").css("display") == "none") {
		$(".indicatorArea").css("display","block");
	}

	else{
		$(".indicatorArea").css("display","block");
	}
}





function removeContent(element) {
	element.html("");
}

function loadDirectoryContent(element, nameArray) {
	removeContent(element);

	for(var i=0; i<nameArray.length; i++) {
		element.append("<div class='dir' ondblclick='openDirectory(this)'>" + nameArray[i] + "</div>\n");
	}
}

function loadFileContent(element, array) {
	removeContent(element);
	console.log(array);
	for (var i=0; i<array.length; i++) {
		var typeOfFile;

		if (array[i].type) {
			typeOfFile = array[i].type.split("/");
		}
		else {
			typeOfFile = "";
		}
		console.log(typeOfFile);
		switch(typeOfFile[0]){
			case "text": 
				element.append("<div class='file'><div class='img'><i class='fas fa-5x fa-file-alt'></i></div><div class='name'>" + array[i].name + "</div></div>");
				break;

			case "image": 
				element.append("<div id='ttest' class='file'><div class='img'><i class='fas fa-5x fa-file-image'></i></div><div class='name'>" + array[i].name + "</div></div>");
				break;

			case "audio": 
				element.append("<div class='file'><div class='img'><i class='fas fa-5x fa-file-audio'></i></div><div class='name'>" + array[i].name + "</div></div>") ;
				break;

			case "video": 
				element.append("<div class='file'><div class='img'><i class='fas fa-5x fa-file-video'></i></div><div class='name'>" + array[i].name + "</div></div>");
				break;

			case "application": 
				element.append("<div class='file'><div class='img'><i class='fas fa-5x fa-file-alt'></i></div><div class='name'>" + array[i].name + "</div></div>") ;
				break;
			default: element.append("<div class='file'><div class='img'><i class='fas fa-5x fa-file'></i></div><div class='name'>" + array[i].name + "</div></div>") ;;
		}
	}
}







function openDirectory(e) {
	var name = e.innerHTML;
	socket.emit("openDirectory", {"name": name});
}

function returnToUpperDirectory() {
	socket.emit("returnToUpperDirectory");
}








function message(text){
	$("#sprava").html(text);
	$("#message").css("display","block").fadeOut(4000);
}

function createDrectory() {
	var name = $("#addDirectoryName").val();
	socket.emit("createNewDirectory", {
		name : name
	});

	showHideWindow();
	message("Priečinok bol pridaný!");
	socket.emit("lsDirectories");
	socket.on("lsDirectoriesReturn", (pole) => {
		loadDirectoryContent($("#directories"),pole)
	});
}

socket.emit("lsDirectories");
socket.emit("lsFiles");

socket.on("lsDirectoriesReturn", (pole) => {
	loadDirectoryContent($("#directories"), pole);
	setDirectoriesListener();
});

socket.on("openDirectoryReturn", () => {
	socket.emit("lsDirectories");
	socket.emit("lsFiles");
})

socket.on("lsFilesReturn", (pole) => {
	loadFileContent($("#files"), pole);
	setFileListener();
});

socket.on("returnToUpperDirectoryReturn", () => {
	socket.emit("lsDirectories");
	socket.emit("lsFiles");
});

socket.on("siteRefresh", () => {
	socket.emit("lsDirectories");
	socket.emit("lsFiles");
});

socket.on("errorMessage", () => {
	message(errorMessage);
})


/*
function deleteContextMenu(){
	$("#context").css("display","none");
	$("#contextDir").css("display","none");
	$("#contextFile").css("display","none");
}*/

/* 
<!-- context menu in body -->
     <div id="context">
     	<ul id="contextMenu">
     		<li onclick="showWindow('directory')" class="contextLi">
     			<i class="fas fa-plus cMenuIcon"></i>  Add directory</li>
     		<li onclick="showWindow('file')" class="contextLi">
     			<i class="fas fa-plus cMenuIcon" ></i>  Add file</li>
     	</ul>
     </div>

<!--  context menu for folders-->
	<div id="contextDir">
     	<ul id="contextMenu">
     			<li onclick="" class="contextLi">
     			<i class="fas fa-plus cMenuIcon" ></i> Open directory </li>
   
     		<li class="contextLi"><i class="fas fa-minus cMenuIcon"></i> Add directory to category</li>
     	</ul>
     </div>

<!--  context menu for files-->
	<div id="contextFile">
     	<ul id="contextMenu">
     		<li onclick="showWindow('file')" class="contextLi">
     			<i class="fas fa-plus cMenuIcon" ></i>  Add file</li>
     		
     		<li class="contextLi"><i class="fas fa-minus cMenuIcon"></i>  file</li>
     	</ul>
     </div>
*/

$(document).on("contextmenu", function (e) {

	$("#context").css("display","none");
    e.preventDefault(); 
    e.stopPropagation();                

    $("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Add file </li>");
	$("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Add directory </li>");
		

    $("#context").css("left", e.pageX);   
    $("#context").css("top", e.pageY);    
    $("#context").fadeIn(500, startFocusOut()); 
});

function startFocusOut() {
    
    $(document).on("click", function () {   
        $("#context").hide(500);              
        $(document).off("click"); 
        $("#contextLi").remove();          
     });
 }

function set_x_contextmenu_position(contextMenu, x) { //x  je xova suradnica kurzora myši a contextMenu je DOM element stránky
    if(x + contextMenu.offsetWidth > window.innerWidth) {
      x = x - contextMenu.offsetWidth;
    }
    return x;
}

function set_y_contextmenu_position(contextMenu, y) {
    y += document.body.scrollTop;
    if(y + contextMenu.offsetHeight > window.innerHeight + document.body.scrollTop) {
      y -=  contextMenu.offsetHeight * 2;
    }
    return y;
 }

function setFileListener() {

	$(".file").on("contextmenu", function (e) {
		
		$("#context").css("display","none");
		$("#contextLi").remove();

	    e.preventDefault();    
	    e.stopPropagation();
	   
	   nameOfElement = e.target.parentElement.children[1].innerHTML;

		$("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Open file </li>");
		$("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Delete file </li>");
		$("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Download file </li>");
		$("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Add to category  </li>");

	    
	    $("#context").css("left", e.pageX);  
	    $("#context").css("top", e.pageY);    
	    $("#context").fadeIn(500, startFocusOut()); 
	});
}

// function startFocusOut() {

//     $(".file").on("click", function () {   
//         $("#context").hide(500);              // To hide the context menu
//         $(document).off("click");
//         $("#contextLi").remove();           
//     });
// }



function setDirectoriesListener(){

	$(".dir").bind("contextmenu", function (e) {
		
		e.preventDefault();  
		e.stopPropagation();
		$("#context").css("display","none");
		$("#contextLi").remove();              

		$("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Open directory </li>");
		$("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Delete directory </li>");
		$("#contextMenu").append("<li onclick='' class='contextLi'><i class='fas fa-plus cMenuIcon'></i> Add to category  </li>");

    	$("#context").css("left", e.pageX);   // For updating the menu position.
	    $("#context").css("top", e.pageY);    // 
	    $("#context").fadeIn(500, startFocusOut()); //  For bringing the context menu in picture.
	});

	// function startFocusOut() {
	// 	$("#contextLi").remove(); 
 //    	$(".dir").on("click", function () {   
 //    	    $("#context").hide(500);              // To hide the context menu
 //    	    $(document).off("click");

 //    	});
	// }
}