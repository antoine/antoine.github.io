//"use strict";
//console.log("as");


function idget(id) {
  return document.getElementById(id);
}

function tojson(ob) {
  return JSON.stringify(ob, function (key, value) {
  if(value instanceof Map) {
    return Array.from(value.entries()); // or with spread: value: [...value]
  } else {
    return value;
  }
}, 2);
}

function jsonfrom(id) {
  return JSON.parse(idget(id).value);
}
function doOnClick(id, dowhat) {
  idget(id).onclick = dowhat;
}
function show(showroom, data) {
  if (typeof data === "string" || data instanceof String) {
    idget(showroom).innerHTML = "<p>" + data + "</p>";
  } else {
    idget(showroom).innerHTML =
      "<p><pre><code class='small'>" +
      tojson(data) +
      "</code></pre></p>" ;
  }
}
function log(data) {
  console.log(data);
  visiblelog(data, false);
}
function logUserData(data) {
  console.log(data);
  visiblelog(data, true);
}
function loge(data) {
  console.error(data);
  visiblelog(data);
}
function visiblelog(data) {
  visiblelog(data, false);
}

function ifdef(o) {
return typeof o !== 'undefined';
}
function uuidv4() {
  //from http://stackoverflow.com/questions/105034/ddg#2117523
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function visiblelog(data, returnedToESPUser) {
  //no error marker yet
  if (typeof data === "string" || data instanceof String) {
    idget("visible_console").innerHTML += "<p>" + data + "</p>";
  } else {
    idget("visible_console").innerHTML +=
      (returnedToESPUser ? " <div class='row mt-1'> <div class='col-1 bg-success' > </div><div class='col-11'>" : "") +
      "<p><pre><code class='small'>" +
      tojson(data) +
      "</code></pre></p>" +
      (returnedToESPUser ? "</div></div>" : "");
  }
}
function setQuery(id, json) {
  doOnClick(id, function () {
    idget("query").innerHTML = tojson(json);
  });
}

//ESP executor
//function ESPSystem(config, systems) {
function ESPSystem() {

    var nextIGID = 0;
    var nextIFID = 0;
    var files= new Map();
    var links = [];



    this.addIG = function(buttonId) {
        files.set(    
            nextIFID,{ 
            ifid:nextIFID,
            groups: [{IGID:nextIGID}], 
            excludedGroups: []
            });
        refreshLeftIGList();
        refreshRightIGList();
        removeInconsistentLinkColoursList();
        show("groupsShowroom", files);
        nextIGID ++;
        nextIFID ++;
        idget(buttonId).innerHTML= "add IG " + nextIGID;
    };

    var refreshLeftIGList = function() {
        var select = idget("leftIG");
       cleanSelect(select); 
       files.forEach(function(file) {
           file.groups.forEach(function(freeGroup) {
               var groupOption = document.createElement("option"); 
               groupOption.text = freeGroup.IGID;
               select.add(groupOption);
           });
       });
    };

    var refreshRightIGList = function() {
        var currentlyOnLeft = currentValue ("leftIG");
        var select = idget("rightIG");
       cleanSelect(select); 
       files.forEach(function(file) {
           file.groups.forEach(function(freeGroup) {
            
            if (freeGroup.IGID != currentlyOnLeft) {
           var groupOption = document.createElement("option"); 
           groupOption.text = freeGroup.IGID;
           select.add(groupOption);
           }
       });
       });
    };


    this.getNextIGIDForButton = function() {
        return nextIGID;
    };

    this.leftIGChosen= function() {
        refreshRightIGList();
    };

    this.rightIGChosen= function() {
        removeInconsistentLinkColoursList();
    };

    this.addLink = function() {
        var colour = currentValue ("linkColour");
        var currentlyOnLeft = currentValue ("leftIG");
        var currentlyOnRight = currentValue ("rightIG");
        links.push ({colour:colour, left:currentlyOnLeft, right:currentlyOnRight}); 
        //merge-forcesplit files
        if (colour === 'WL' || colour === 'MRL') {
        //merge
        moveInSameFile(currentlyOnLeft, currentlyOnRight);
        } else if (colour === 'NMRL' || colour === 'GL') {
        //forcesplit
        keepInDifferentFiles(currentlyOnLeft, currentlyOnRight);
        }

        show("linksShowroom", links);
        show("groupsShowroom", files);
    };

    var moveInSameFile = function(leftIG, rightIG) {
    var leftIf = (fileOfGroup (leftIG));
    var rightIf = (fileOfGroup (rightIG));
    if (leftIf === rightIf) {
        log(leftIG +" and "+rightIG+" are already in the same file "+leftIf+" nothing to do");
    } else {
        //TODO check excluded groups
        files.get(leftIf).groups.push(takeGroupFromFile(rightIG, rightIf));
    }
    

    }

    var fileOfGroup= function(group) {
        var foundIfid;

        files.forEach(function(file, ifid) {
        if ( !ifdef(foundIfid)) {
                file.groups.every(function(freeGroup ) {
                        if (freeGroup.IGID == group) {
                        foundIfid = ifid;
                        return false;

                        } else {
                        return true;}
                        });
                        }
                });


        return foundIfid;
    }

    var takeGroupFromFile = function(IGID, IFID) {
    var newGroups = []; 
    var takenGroup;
    var file = files.get(IFID);
    for (var i = 0; i<file.groups.length; i++) {
    var group = file.groups[i];
    if (group.IGID == IGID) {
        takenGroup = group;
    } else {
    newGroups.push(group);

    }
    }

    if (newGroups.length > 0) {
        files.get(IFID).groups = newGroups;
    } else {
        files.delete(IFID);
    }

    return takenGroup;


    }

    var keepInDifferentFiles = function(leftIG, rightIG) {
    loge("keepInDifferentFiles not implemented");
    }

    var currentValue = function(selectId) {
        var leftIGs= idget(selectId);
        return leftIGs.options[leftIGs.selectedIndex].value;
    };

    var removeInconsistentLinkColoursList= function() {
    //we need to know the IF to ensure no consistent issue is created
    loge("removeInconsistentLinkColoursList not implemented");
    };

    var cleanSelect = function (select) {
        var i, L = select.options.length - 1;
        for(i = L; i >= 0; i--) {
            select.remove(i);
        }
    };

    this.getIGs = function() {
        return groups;
    };
    }


var esp = new ESPSystem();
//init add IG button
idget("addIGButton").innerHTML= "add IG " + esp.getNextIGIDForButton();

doOnClick("addIGButton", function () {
  esp.addIG("addIGButton");
});

doOnClick("addLinkButton", function () {
  esp.addLink();
});

idget("leftIG").onchange = function() {
    esp.leftIGChosen();
};

idget("rightIG").onchange = function() {
    esp.rightIGChosen();
};
