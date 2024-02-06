"use strict";
//console.log("as");

function idget(id) {
  return document.getElementById(id);
}

/*
function jsonfrom(id) {
  return JSON.parse(idget(id).value);
}
*/
function doOnClick(id, dowhat) {
  idget(id).onclick = dowhat;
}
function printForUser(showroom, name, data) {
  if (typeof data === "string" || data instanceof String) {
    idget(showroom).innerHTML = "<p>" + name + "</p><p>" + data + "</p>";
  } else {
    idget(showroom).innerHTML = "<p>" + name + "</p><p><pre><code class='small'>" + tojson(data) + "</code></pre></p>";
  }
}

//STATE serizalition
function tojson(ob) {
  return JSON.stringify(ob, JSONStringifyReplacer, 2);
}

function JSONStringifyReplacer(key, value) {
  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else if (value instanceof Set) {
    return {
      dataType: "Set",
      value: Array.from(value.values()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

function JSONStringifyReviver(key, value) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value);
    } else if (value.dataType === "Set") {
      return new Set(value.value);
    }
  }
  return value;
}

function ifdef(o) {
  return typeof o !== "undefined";
}

//form elements manipulation
function currentValue(selectId) {
  var select = idget(selectId);
  if (select.selectedIndex >= 0) {
    return select.options[select.selectedIndex].value;
  }
}
function cleanSelect(select) {
  var i,
    L = select.options.length - 1;
  for (i = L; i >= 0; i--) {
    select.remove(i);
  }
}
/*
function uuidv4() {
  //from http://stackoverflow.com/questions/105034/ddg#2117523
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
*/

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
function visiblelog(data, returnedToESPUser) {
  //no error marker yet
  if (typeof data === "string" || data instanceof String) {
    idget("visible_console").innerHTML += "<p>" + data + "</p>";
  } else {
    idget("visible_console").innerHTML +=
      (returnedToESPUser ? " <div class='row mt-1'> <div class='col-1 bg-success' > </div><div class='col-11'>" : "") + "<p><pre><code class='small'>" + tojson(data) + "</code></pre></p>" + (returnedToESPUser ? "</div></div>" : "");
  }
}

function show(id) {
  idget(id).style.display = "initial";
}

function hide(id) {
  idget(id).style.display = "none";
}

/*
function setQuery(id, json) {
  doOnClick(id, function () {
    idget("query").innerHTML = tojson(json);
  });
}
*/

function CMDSystem(graph, systemsForMIDQuery, systemsForCIRQuery, groupsForCIRQuery) {
  //data structure
  var nextSystemID = 0;
  var nextIGID = 0;
  var nextIFID = 0;
  var nextLinkID = 0;
  var files = new Map();
  var links = [];
  var systems = [];

  //managing the buttons allowing the manipulation of state
  //constraints are checked when populating the form, thus constraints are (well, should not be) not checked when adding
  //data, as constraints are assumed not to be possible because the form content was built to prevent them.

  this.addSystem = function (buttonId) {
    var systemNameInput = idget("systemName");
    var systemName;

    if (systemNameInput.value == "") {
      systemName = "system " + nextSystemID;
    } else {
      systemName = systemNameInput.value + "_" + nextSystemID;
    }
    systems.push({ EUISID: nextSystemID, name: systemName });
    refreshSystemsOfGroupList();
    //since refreshing the systems will de-toggle them we need to de-toggle the groups as well
    refreshGroupsListForCIRQuery();
    printForUser("systemsShowroom", "systems", systems);
    nextSystemID++;
    idget(buttonId).innerHTML = "add system " + nextSystemID;
    reflectStateInURL();
  };

  var refreshSystemsOfGroupList = function () {
    var select = idget("systemOfGroup");
    cleanSelect(select);
    systems.forEach(function (system) {
      var systemOption = document.createElement("option");
      systemOption.text = system.name;
      systemOption.value = system.EUISID;
      select.add(systemOption);
    });
    refreshSystemsLists();
  };

  this.addIG = function (buttonId) {
    var selectedSystem = currentValue("systemOfGroup");
    if (ifdef(selectedSystem)) {
      //define system for each IG, remove IG frm same system
      files.set(nextIFID, {
        ifid: nextIFID,
        groups: [
          {
            IGID: nextIGID,
            //using the unary + to convert to number
            EUISID: +selectedSystem,
          },
        ],
        excludedGroups: [],
      });
      refreshLeftIGList();
      refreshRightIGList();
      refreshLinkColoursList();
      printForUser("systemsShowroom", "systems", systems);
      printForUser("groupsShowroom", "individual files", files);
      nextIGID++;
      nextIFID++;
      idget(buttonId).innerHTML = "add identity group " + nextIGID;
      regraph();
      reflectStateInURL();
      refreshGroupsListForCIRQuery();
    }
  };

  var reflectStateInURL = function () {
    //yes, there is a limit to the URL, don't go beyond it is my advice
    history.pushState(null, null, "?state=" + encodeURIComponent(cmd.jsonRepresentation()));
  };

  this.reloadStateFromUrl = function () {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(prop),
    });
    // Get the value of "some_key" in eg "https://example.com/?some_key=some_value"
    // let value = params.some_key; // "some_value"
    if (ifdef(params.state)) {
      console.log("loading " + params.state);
      this.reloadWith(params.state, false);
    }
  };

  var refreshLeftIGList = function () {
    var select = idget("leftIG");
    cleanSelect(select);
    files.forEach(function (file) {
      file.groups.forEach(function (freeGroup) {
        var groupOption = document.createElement("option");
        groupOption.text = freeGroup.IGID;
        select.add(groupOption);
      });
    });
  };

  var refreshRightIGList = function () {
    var currentlyOnLeft = currentValue("leftIG");
    var select = idget("rightIG");
    cleanSelect(select);
    if (ifdef(currentlyOnLeft)) {
      var leftGroup = groupAndIFID(currentlyOnLeft).group;
      cleanSelect(select);
      files.forEach(function (file) {
        file.groups.forEach(function (freeGroup) {
          //TODO if already 2 yellow between them then the right IG should be removed
          if (freeGroup.IGID != currentlyOnLeft && freeGroup.EUISID != leftGroup.EUISID) {
            var groupOption = document.createElement("option");
            groupOption.text = freeGroup.IGID;
            select.add(groupOption);
          }
        });
      });
    }
  };

  var refreshGroupsListForCIRQuery = function () {
    const span = idget("directMatchesGroups");
    span.innerHTML = "";
    //groupsForCIRQuery.reset();

    files.forEach(function (file) {
      file.groups.forEach(function (group) {
        if (systemsForCIRQuery.values().has(group.EUISID)) {
          var htmlGroupId = "CIRDirectMatchGroup." + group.IGID;
          var option = document.createElement("input");
          option.type = "checkbox";
          option.className = "btn-check";
          option.id = htmlGroupId;
          option.autocomplete = "off";
          if (groupsForCIRQuery.values().has(group.IGID)) {
            option.checked = true;
          }
          option.onclick = function () {
            groupsForCIRQuery.toggle(group.IGID);
          };

          var label = document.createElement("label");
          label.htmlFor = htmlGroupId;
          label.className = "btn btn-outline-group btn-outline-colorgroup" + group.EUISID;
          label.innerHTML = group.IGID;

          const space = document.createElement("span");
          space.innerHTML = " ";
          span.appendChild(space);
          span.appendChild(option);
          span.appendChild(label);
        }
      });
    });
  };

  this.getNextSystemIDForButton = function () {
    return nextSystemID;
  };

  this.getNextIGIDForButton = function () {
    return nextIGID;
  };

  this.leftIGChosen = function () {
    refreshRightIGList();
    refreshLinkColoursList();
  };

  this.rightIGChosen = function () {
    refreshLinkColoursList();
  };

  this.addLink = function () {
    var colour = currentValue("linkColour");
    //using the unary + to convert to number
    var currentlyOnLeft = +currentValue("leftIG");
    var currentlyOnRight = +currentValue("rightIG");
    //the exception to not checking for constraints after the fact
    var linkOkToBeAdded = false; //WARN if removing the boolean it protects against adding non-existing link colour too
    //merge-forcesplit files
    if (colour === "WL" || colour === "MRL") {
      //merge
      linkOkToBeAdded = mergeFile(currentlyOnLeft, currentlyOnRight);
    } else if (colour === "NMRL" || colour === "GL") {
      //forcesplit
      linkOkToBeAdded = keepInDifferentFiles(currentlyOnLeft, currentlyOnRight);
    } else if (colour === "YL") {
      //ideally check that rule of prevalence of link assigned to different authority are valid
      linkOkToBeAdded = true;
    }
    if (linkOkToBeAdded) {
      //making sure the lower group is always on the left to facilitate later matching
      links.push({
        ID: nextLinkID,
        colour: colour,
        lower: currentlyOnLeft < currentlyOnRight ? currentlyOnLeft : currentlyOnRight,
        higher: currentlyOnLeft < currentlyOnRight ? currentlyOnRight : currentlyOnLeft,
      });
      nextLinkID++;
    }

    printForUser("systemsShowroom", "systems", systems);
    printForUser("linksShowroom", "links", links);
    printForUser("groupsShowroom", "individual files", files);
    refreshRightIGList();
    refreshLinkColoursList();
    refreshQueriableLinksList();
    regraph();
    reflectStateInURL();
  };

  var refreshSystemsLists = function () {
    refreshSystemsListForShow();
    refreshSystemsListForMIDQuery();
    refreshSystemsListForCIRQuery();
  };

  var refreshSystemsListForShow = function () {
    const span = idget("systemsListForShow");
    span.innerHTML = "";

    systems.forEach(function (system) {
      var option = document.createElement("span");
      option.innerHTML = system.name;
      option.className = "badge";
      option.style.cssText = "background-color:" + graph.getColorForEUIS(system.EUISID);
      const space = document.createElement("span");
      space.innerHTML = " ";
      span.appendChild(space);
      span.appendChild(option);
    });
  };

  var refreshSystemsListForMIDQuery = function () {
    refreshSystemsList("systemsListForMIDQuery", "MIDLinkedMatchSystem.", systemsForMIDQuery);
  };

  var refreshSystemsListForCIRQuery = function () {
    refreshSystemsList("systemsAccessCIR", "CIRDirectMatchSystem.", systemsForCIRQuery);
  };

  var refreshSystemsList = function (spanName, idBase, systemsSelector) {
    const span = idget(spanName);
    span.innerHTML = "";

    var systemsFound = false;

    systems.forEach(function (system) {
      systemsFound = true;
      var htmlSystemId = idBase + system.EUISID;
      var option = document.createElement("input");
      if (systemsSelector.values().has(system.EUISID)) {
        option.checked = true;
      }
      option.type = "checkbox";
      option.className = "btn-check";
      option.id = htmlSystemId;
      option.autocomplete = "off";
      option.onclick = function () {
        systemsSelector.toggle(system.EUISID);
        refreshGroupsListForCIRQuery();
      };

      var label = document.createElement("label");
      label.htmlFor = htmlSystemId;
      label.className = "btn btn-outline-group btn-outline-colorgroup" + system.EUISID;
      label.innerHTML = system.name;

      const space = document.createElement("span");
      space.innerHTML = " ";
      span.appendChild(space);
      span.appendChild(option);
      span.appendChild(label);
    });
    if (!systemsFound) {
      span.innerHTML = "you need to add some systems to your data first";
    }
  };

  var refreshQueriableLinksList = function () {
    var select = idget("queriedLink");
    cleanSelect(select);
    links.forEach(function (link) {
      var option = document.createElement("option");
      option.text = nameThisLink(link);
      option.value = link.ID;
      select.add(option);
    });
  };

  var mergeFile = function (leftIG, rightIG) {
    var leftIfId = fileOfGroup(leftIG);
    var rightIfId = fileOfGroup(rightIG);
    if (leftIfId === rightIfId) {
      //this should never arrise, and is the only reason for post-constraint checking.
      log(leftIG + " and " + rightIG + " are already in the same file " + leftIfId + " nothing to do, but links is created");
    } else {
      //merging right onto left
      var leftFile = files.get(leftIfId);
      var rightFile = files.get(rightIfId);
      //merging groups, sure
      rightFile.groups.forEach(function (group) {
        leftFile.groups.push(group);
      });
      //but also collecting the exclusions from the merged group
      rightFile.excludedGroups.forEach(function (excludedGroup) {
        leftFile.excludedGroups.push(excludedGroup);
      });

      files.delete(rightIfId);
    }
    return true;
  };

  var groupAndIFID = function (groupID) {
    var foundGroup;

    files.forEach(function (file, ifid) {
      if (!ifdef(foundGroup)) {
        file.groups.every(function (freeGroup) {
          if (freeGroup.IGID == groupID) {
            foundGroup = { group: freeGroup, ifid: ifid };
            return false;
          } else {
            return true;
          }
        });
      }
    });

    return foundGroup;
  };

  var fileOfGroup = function (groupID) {
    var foundIfid;

    files.forEach(function (file, ifid) {
      if (!ifdef(foundIfid)) {
        file.groups.every(function (freeGroup) {
          if (freeGroup.IGID == groupID) {
            foundIfid = ifid;
            return false;
          } else {
            return true;
          }
        });
      }
    });

    return foundIfid;
  };

  var keepInDifferentFiles = function (leftIG, rightIG) {
    var leftIfId = fileOfGroup(leftIG);
    var rightIfId = fileOfGroup(rightIG);
    if (leftIfId === rightIfId) {
      //XXX cam this test be removed? this should never happen since we exclude the link outright, should this (and the returned boolean) remain?
      loge(leftIG + " and " + rightIG + " are already in the same file " + leftIfId + ", they cannot be kept in different files anymore. ");
      return false;
    } else {
      //XXX excludedGroups will contain duplicates over time, not an issue but
      //not very clean either
      var leftFile = files.get(leftIfId);
      leftFile.excludedGroups.push(rightIG);
      var rightFile = files.get(rightIfId);
      rightFile.excludedGroups.push(leftIG);
    }
    return true;
  };

  var refreshLinkColoursList = function () {
    //we need to know the IF to ensure no consistent issue is created
    var currentlyOnLeft = currentValue("leftIG");
    var currentlyOnRight = currentValue("rightIG");
    if (ifdef(currentlyOnLeft) && ifdef(currentlyOnRight)) {
      //links are always created with the lower ig id first
      var lowerIgId = currentlyOnLeft < currentlyOnRight ? currentlyOnLeft : currentlyOnRight;
      var higherIgId = currentlyOnLeft < currentlyOnRight ? currentlyOnRight : currentlyOnLeft;

      var select = idget("linkColour");
      cleanSelect(select);

      var canHaveWL = true;
      var canHaveMRL = true;
      var canHaveNMRL = true;
      var canHaveGL = true;

      links.forEach(function (link) {
        if (link.colour != "YL" && link.lower == lowerIgId && link.higher == higherIgId) {
          //already a non YL link
          canHaveWL = false;
          canHaveMRL = false;
          canHaveNMRL = false;
          canHaveGL = false;
        }
      });

      //checking to see if non-merging links are possible
      var leftIfId = fileOfGroup(currentlyOnLeft);
      var rightIfId = fileOfGroup(currentlyOnRight);
      var leftFile = files.get(leftIfId);
      leftFile.groups.every(function (group) {
        if (group.IGID == currentlyOnRight) {
          //remove non merging links to groups already in the same file.
          canHaveNMRL = false;
          canHaveGL = false;
          return false;
        } else {
          return true;
        }
      });

      //now checking to see if merging links are possible
      var rightFile = files.get(rightIfId);
      if (!areMergingLinksPossible(leftFile, rightFile) || !areMergingLinksPossible(rightFile, leftFile)) {
        canHaveMRL = false;
        canHaveWL = false;
      }

      addColourIfPossible(canHaveWL, "White", "WL", select);
      addColourIfPossible(canHaveMRL, "Merging red", "MRL", select);
      addColourIfPossible(canHaveNMRL, "Non merging red", "NMRL", select);
      addColourIfPossible(canHaveGL, "Green", "GL", select);

      //assuming multiple yellows are always possible, no case 10 prevalence implemented
      addColourIfPossible(true, "Yellow", "YL", select);
    }
  };

  var areMergingLinksPossible = function (aFile, anotherFile) {
    var possible = true;
    aFile.excludedGroups.every(function (leftExcludedGroup) {
      anotherFile.groups.every(function (rightGroup) {
        if (leftExcludedGroup == rightGroup.IGID) {
          possible = false;
        }
        return possible;
      });
      //for every() contract
      return possible;
    });
    return possible;
  };

  var addColourIfPossible = function (possible, text, value, select) {
    if (possible) {
      var option = document.createElement("option");
      option.text = text;
      option.value = value;
      select.add(option);
    }
  };

  this.getIGs = function () {
    return groups;
  };

  //managing local and external storage options

  this.jsonRepresentation = function () {
    return JSON.stringify(
      {
        nextSystemID: nextSystemID,
        nextIGID: nextIGID,
        nextIFID: nextIFID,
        nextLinkID: nextLinkID,
        files: files,
        systems: systems,
        links: links,
      },
      JSONStringifyReplacer,
    );
  };

  this.reloadWith = function (rawState, refreshURL) {
    var state = JSON.parse(rawState, JSONStringifyReviver);
    if (state != null) {
      systemsForMIDQuery.reset();
      systemsForCIRQuery.reset();
      groupsForCIRQuery.reset();
      files = state.files;
      systems = state.systems;
      links = state.links;
      nextSystemID = state.nextSystemID;
      nextIGID = state.nextIGID;
      nextIFID = state.nextIFID;
      nextLinkID = state.nextLinkID;

      printForUser("systemsShowroom", "systems", systems);
      printForUser("linksShowroom", "links", links);
      printForUser("groupsShowroom", "individual files", files);
      refreshLeftIGList();
      refreshGroupsListForCIRQuery();
      refreshRightIGList();
      refreshLinkColoursList();
      refreshSystemsOfGroupList();
      refreshQueriableLinksList();

      idget("addSystemButton").innerHTML = "add system " + nextSystemID;
      idget("addIGButton").innerHTML = "add identity group " + nextIGID;
      regraph();
      if (refreshURL) {
        reflectStateInURL();
      }
    } else {
      this.resetState();
    }
  };

  this.resetState = function () {
    this.reloadWith('{"nextSystemID":0,"nextIGID":0,"nextIFID":0,"nextLinkID":0,"files":{"dataType":"Map","value":[]},"systems":[],"links":[]}', true);
  };

  //managing queries

  this.getLink = function (linkID) {
    var foundLink;
    links.every(function (link) {
      if (link.ID == linkID) {
        foundLink = link;
        return false;
      } else {
        return true;
      }
    });
    return foundLink;
  };

  this.getRelationOf = function (link) {
    var linksInSameRelation = [];
    links.forEach(function (observedLink) {
      if (observedLink.lower == link.lower && observedLink.higher == link.higher) {
        linksInSameRelation.push(observedLink);
      }
    });
    return linksInSameRelation;
  };

  this.getGroup = function (groupID) {
    return groupAndIFID(groupID).group;
  };

  this.followLinks = function (directMatchesToConsider, systemsToWhichAccessIsGranted) {
    const matchesAndLinksLeadingToThisPoint = {
      matches: [],
      links: [],
    };
    var newDirectMatchesAndLinks = followLinksDepthFirst(directMatchesToConsider, directMatchesToConsider, systemsToWhichAccessIsGranted, null, matchesAndLinksLeadingToThisPoint, 2);
    //TODO fetch green links considering newDirectMatches[].IGID and directMatchesToConsider together

    return Array.from(new Set(newDirectMatchesAndLinks.links).values());
  };

  //recursive call, follwing links as potential cycling graphs
  var followLinksDepthFirst = function (startingPoints, originalDMs, STPRs, callingFrom, MaLlttp, increment) {
    //TODO opti: do not got looking for groups in the originalDMs

    //logging this is very usefull in debugging
    //but it's some heavy logs
    var heavyLogs = true;
    var inc = incrementInSpaces(increment);

    function hlog(stuff) {
      if (heavyLogs) {
        console.log(stuff);
      }
    }

    const newMaL = {
      matches: [],
      links: [],
    };

    var moreLinksToFollow = [];

    if (callingFrom != null) {
      MaLlttp.matches.push(callingFrom.match);
      MaLlttp.links.push(callingFrom.link);
    }

    startingPoints.forEach(function (currentIG) {
      if (isOneOf(currentIG, MaLlttp.matches)) {
        hlog(inc + "we've been through the group " + currentIG + " before in this thread, keeping the link " + callingFrom.link + " and stopping here, already seen groups are " + JSON.stringify(MaLlttp.matches));
        if (MaLlttp.matches.length > 0) {
          hlog(inc + "all past groups are WINNERs " + JSON.stringify(MaLlttp.matches));
          newMaL.matches.push(...MaLlttp.matches);
        }
        if (MaLlttp.links.length > 0) {
          hlog(inc + "all past links are WINNERs " + JSON.stringify(MaLlttp.links));
          newMaL.links.push(...MaLlttp.links);
        }
      } else {
        hlog(inc + "looking for links from IG " + currentIG + ", links leading to this point are " + JSON.stringify(MaLlttp.links));

        links.forEach(function (link) {
          //hlog(inc + "considering link " + link.ID + " " + nameThisLink(link));
          //excluding the link we just called from
          if (callingFrom == null || link.ID != callingFrom.link) {
            if (link.lower == currentIG || link.higher == currentIG) {
              const otherEndIG = groupAndIFID(link.lower == currentIG ? link.higher : link.lower).group;
              const thisEndIG = groupAndIFID(link.higher == currentIG ? link.higher : link.lower).group;
              hlog(inc + "link " + link.ID + " " + nameThisLink(link) + " connects currentIG " + thisEndIG.IGID);

              if (link.colour == "MRL" || link.colour == "NMRL" || (link.colour == "WL" && isOneOf(otherEndIG.EUISID, STPRs))) {
                hlog(inc + "link goes somewhere else, going deeper");
                moreLinksToFollow.push({
                  nextGroup: otherEndIG.IGID,
                  match: thisEndIG.IGID,
                  link: link.ID,
                });
              } else {
                if (link.colour == "YL" || link.colour == "GL") {
                  hlog(inc + "but it's " + link.colour + " so not followable");
                } else if (link.colour == "WL") {
                  hlog(inc + "but it's " + link.colour + " and the other End group belongs to " + otherEndIG.EUISID + " which is not an STPR " + JSON.stringify(STPRs));
                } else {
                  hlog("logic issue!!!!");
                }
              }
            } else {
              //hlog(inc + "link is not connected to currentIG " + currentIG + ", disregarding");
            }
          } else {
            //hlog(inc + "link is same as the one we are calling from, disregarding");
          }
        });
        if (moreLinksToFollow.length <= 0) {
          hlog(inc + "no more links could be followed, collecting path.");
          //found the end of a path!
          if (MaLlttp.matches.length > 0) {
            hlog(inc + "all past groups are WINNERs " + JSON.stringify(MaLlttp.matches));
            newMaL.matches.push(...MaLlttp.matches);
          }
          if (MaLlttp.links.length > 0) {
            hlog(inc + "all past links are WINNERs " + JSON.stringify(MaLlttp.links));
            newMaL.links.push(...MaLlttp.links);
          }
        }

        //Array.slice(0) is a way to get a shallow copy of an array
        moreLinksToFollow.forEach(function (linkInfos) {
          //TODO load all IG from same group owned by STPRs as new group, that's when we can have multiple directMatches to consider beside the first step
          const fLinks = followLinks([linkInfos.nextGroup], originalDMs, STPRs, linkInfos, { matches: MaLlttp.matches.slice(0), links: MaLlttp.links.slice(0) }, increment + 2);
          newMaL.matches.push(...fLinks.matches);
          newMaL.links.push(...fLinks.links);
        });
      }
    });

    return newMaL;
  };

  //recursive call, follwing links as potential cycling graphs
  //since we make a breath first exploration it works but returns a lot of duplicate information.
  var followLinksBreadthFirst = function (startingPoints, originalDMs, STPRs, callingFrom, MaLlttp, increment) {
    //TODO opti: do not got looking for groups in the originalDMs

    //logging this is very usefull in debugging
    //but it's some heavy logs
    var heavyLogs = true;
    var inc = incrementInSpaces(increment);

    function hlog(stuff) {
      if (heavyLogs) {
        console.log(stuff);
      }
    }

    const newMaL = {
      matches: [],
      links: [],
    };

    var moreLinksToFollow = [];

    if (callingFrom != null) {
      MaLlttp.matches.push(callingFrom.match);
      MaLlttp.links.push(callingFrom.link);
    }

    startingPoints.forEach(function (currentIG) {
      if (isOneOf(currentIG, MaLlttp.matches)) {
        hlog(inc + "we've been through the group " + currentIG + " before in this thread, keeping the link " + callingFrom.link + " and stopping here, already seen groups are " + JSON.stringify(MaLlttp.matches));
        if (MaLlttp.matches.length > 0) {
          hlog(inc + "all past groups are WINNERs " + JSON.stringify(MaLlttp.matches));
          newMaL.matches.push(...MaLlttp.matches);
        }
        if (MaLlttp.links.length > 0) {
          hlog(inc + "all past links are WINNERs " + JSON.stringify(MaLlttp.links));
          newMaL.links.push(...MaLlttp.links);
        }
      } else {
        hlog(inc + "looking for links from IG " + currentIG + ", links leading to this point are " + JSON.stringify(MaLlttp.links));

        links.forEach(function (link) {
          //hlog(inc + "considering link " + link.ID + " " + nameThisLink(link));
          //excluding the link we just called from
          if (callingFrom == null || link.ID != callingFrom.link) {
            if (link.lower == currentIG || link.higher == currentIG) {
              const otherEndIG = groupAndIFID(link.lower == currentIG ? link.higher : link.lower).group;
              const thisEndIG = groupAndIFID(link.higher == currentIG ? link.higher : link.lower).group;
              hlog(inc + "link " + link.ID + " " + nameThisLink(link) + " connects currentIG " + thisEndIG.IGID);

              if (link.colour == "MRL" || link.colour == "NMRL" || (link.colour == "WL" && isOneOf(otherEndIG.EUISID, STPRs))) {
                hlog(inc + "link goes somewhere else, going deeper");
                moreLinksToFollow.push({
                  nextGroup: otherEndIG.IGID,
                  match: thisEndIG.IGID,
                  link: link.ID,
                });
              } else {
                if (link.colour == "YL" || link.colour == "GL") {
                  hlog(inc + "but it's " + link.colour + " so not followable");
                } else if (link.colour == "WL") {
                  hlog(inc + "but it's " + link.colour + " and the other End group belongs to " + otherEndIG.EUISID + " which is not an STPR " + JSON.stringify(STPRs));
                } else {
                  hlog("logic issue!!!!");
                }
              }
            } else {
              //hlog(inc + "link is not connected to currentIG " + currentIG + ", disregarding");
            }
          } else {
            //hlog(inc + "link is same as the one we are calling from, disregarding");
          }
        });
        if (moreLinksToFollow.length <= 0) {
          hlog(inc + "no more links could be followed, collecting path.");
          //found the end of a path!
          if (MaLlttp.matches.length > 0) {
            hlog(inc + "all past groups are WINNERs " + JSON.stringify(MaLlttp.matches));
            newMaL.matches.push(...MaLlttp.matches);
          }
          if (MaLlttp.links.length > 0) {
            hlog(inc + "all past links are WINNERs " + JSON.stringify(MaLlttp.links));
            newMaL.links.push(...MaLlttp.links);
          }
        }

        //Array.slice(0) is a way to get a shallow copy of an array
        moreLinksToFollow.forEach(function (linkInfos) {
          //TODO load all IG from same group owned by STPRs as new group, that's when we can have multiple directMatches to consider beside the first step
          const fLinks = followLinks([linkInfos.nextGroup], originalDMs, STPRs, linkInfos, { matches: MaLlttp.matches.slice(0), links: MaLlttp.links.slice(0) }, increment + 2);
          newMaL.matches.push(...fLinks.matches);
          newMaL.links.push(...fLinks.links);
        });
      }
    });

    return newMaL;
  };

  this.indirectLinksOf = function (link, doNotIncludeYellowFromOriginalRelation) {
    //from lower to higher
    //console.log("looking for all indirect links from " + link.lower + " to " + link.higher);
    var linksWeDoNotWantToSee = [];
    //the links of the relation is not strictly required when doing 2nd step
    //query (because 1st step will have provided it), but it help provide a context to the graph
    //in this particular simulation
    this.getRelationOf(link).forEach(function (linkOfTheRelation) {
      if (doNotIncludeYellowFromOriginalRelation && linkOfTheRelation.colour == "YL") {
        //test is required for rectification related 2nd step
        linksWeDoNotWantToSee.push(linkOfTheRelation.ID);
      }
    });
    var allPaths = indirectLinksOf(link.higher, link.lower, null, [], [], 2, linksWeDoNotWantToSee);
    //same as above, the yellow link being the query input is not strictly
    //required to be returned, but it helps the simulation work better
    allPaths.push(link.ID);
    //allPaths may contain duplicates in case of indirect paths sharing a common trunk
    return Array.from(new Set(allPaths).values());
  };

  //recursive call, exploring all links as potential cycling graphs as a breadth first recursive call
  //keeping track of the links and groups up to that point in a given thread to avoid cycling.
  //Once a branch of the recursive call reach the target group all the past link
  //leading to this moment are returned
  var indirectLinksOf = function (targetIG, currentIG, callingFromLink, linksLeadingToThisPoint, groupsLeadingToThisPoint, increment, linksWeDoNotWantToSee) {
    //logging this is very usefull in debugging
    //but it's some heavy logs
    var heavyLogs = false;
    function hlog(stuff) {
      if (heavyLogs) {
        console.log(stuff);
      }
    }

    var indirectLinks = [];
    var moreLinkToFollow = [];
    var inc = incrementInSpaces(increment);
    if (callingFromLink != null) {
      linksLeadingToThisPoint.push(callingFromLink);
    }
    if (isOneOf(currentIG, groupsLeadingToThisPoint)) {
      hlog(inc + "we've been through this group before, diregarding as already seen groups are " + JSON.stringify(groupsLeadingToThisPoint));
    } else {
      groupsLeadingToThisPoint.push(currentIG);
      hlog(inc + "looking for links from " + currentIG + ", links leading to this point are " + JSON.stringify(linksLeadingToThisPoint));

      links.forEach(function (link) {
        hlog(inc + "considering link " + link.ID + ": " + link.lower + "<-> " + link.higher);
        if (!isOneOf(link.ID, linksWeDoNotWantToSee)) {
          //XXX check if next test is still required, as we are checking all
          //groups from the past now
          if (!isOneOf(link.ID, linksLeadingToThisPoint)) {
            //excluding the link we just called from
            //XXX check if next test is still required, as we are checking all links from the past now
            if (link.ID != callingFromLink) {
              if (link.colour != "YL") {
                if (link.lower == currentIG || link.higher == currentIG) {
                  hlog(inc + "link connects currentIG " + currentIG);
                  //ideally should only check the lower one if the higher is a match,
                  //but we should have links between the same group
                  if (link.higher == targetIG || link.lower == targetIG) {
                    hlog(inc + "link is also connected to targetIG " + targetIG + ", a WINNER!!");
                    //found the end of a path!
                    indirectLinks.push(link.ID);
                    hlog(inc + "all past links are WINNER too " + JSON.stringify(linksLeadingToThisPoint));
                    //array.push(...anotherarray) concat anotherarry into array, in
                    //place, array.concat(anotherarray) will happily return a copy of
                    //both without changing them in place because reasons
                    indirectLinks.push(...linksLeadingToThisPoint);
                  } else {
                    hlog(inc + "link goes somewhere else, going deeper");
                    moreLinkToFollow.push({
                      nextIG: link.lower == currentIG ? link.higher : link.lower,
                      linkID: link.ID,
                    });
                  }
                } else {
                  hlog(inc + "link is not connected to currentIG " + currentIG + ", disregarding");
                }
              } else {
                hlog(inc + "link is yellow, disregarding");
              }
            } else {
              hlog(inc + "link is same as the one we are calling from, disregarding");
            }
          } else {
            hlog(inc + "link is from the past, diregarding as past links are " + JSON.stringify(linksLeadingToThisPoint));
          }
        } else {
          hlog(inc + "link is to be ignored, diregarding as links to be ignored are " + JSON.stringify(linksWeDoNotWantToSee));
        }
      });

      //Array.slice(0) is a way to get a shallow copy of an array
      moreLinkToFollow.forEach(function (linkInfos) {
        indirectLinks.push(...indirectLinksOf(targetIG, linkInfos.nextIG, linkInfos.linkID, linksLeadingToThisPoint.slice(0), groupsLeadingToThisPoint.slice(0), increment + 2, linksWeDoNotWantToSee));
      });
    }

    return indirectLinks;
  };

  var isOneOf = function (one, many) {
    var yesItIs = false;

    many.every(function (maybeOne) {
      if (maybeOne == one) {
        yesItIs = true;
        return false;
      } else {
        return true;
      }
    });
    return yesItIs;
  };

  var incrementInSpaces = function (increment) {
    let mySpaces = "";

    while (increment-- > 0) mySpaces += "| ";

    return mySpaces;
  };

  var regraph = function () {
    graph.graphThis(graph.buildGraphData(files, links));
  };

  var insertIfNotKnown = function (filteredFiles, groupAndIfId) {
    if (filteredFiles.has(groupAndIfId.ifid)) {
      var groupsAlreadyInFile = false;
      filteredFiles.get(groupAndIfId.ifid).groups.every(function (alreadyKnownGroup) {
        if (alreadyKnownGroup.IGID == groupAndIfId.group.IGID) {
          groupsAlreadyInFile = true;
          return false;
        } else {
          return true;
        }
      });
      if (!groupsAlreadyInFile) {
        filteredFiles.get(groupAndIfId.ifid).groups.push(groupAndIfId.group);
      }
    } else {
      filteredFiles.set(groupAndIfId.ifid, { ifid: groupAndIfId.ifid, groups: [groupAndIfId.group] });
    }
  };

  this.mergeResultFiles = function (filesA, filesB) {
    filesB.forEach(function (file, ifid) {
      file.groups.forEach(function (group) {
        insertIfNotKnown(filesA, groupAndIFID(group.IGID));
      });
    });
    return filesA;
  };

  this.getFilesFromGroups = function (selectedGroups) {
    const filteredFiles = new Map();
    selectedGroups.forEach(function (groupID) {
      insertIfNotKnown(filteredFiles, groupAndIFID(groupID));
    });
    return filteredFiles;
  };

  this.getFilesFromLinks = function (selectedLinks) {
    const filteredFiles = new Map();
    selectedLinks.forEach(function (link) {
      insertIfNotKnown(filteredFiles, groupAndIFID(link.lower));
      insertIfNotKnown(filteredFiles, groupAndIFID(link.higher));
    });
    return filteredFiles;
  };

  this.getLinks = function (selectedLinksIDs) {
    const selectedLinks = [];
    links.forEach(function (link) {
      selectedLinksIDs.forEach(function (selectedLinkID) {
        if (link.ID == selectedLinkID) {
          selectedLinks.push(link);
          return false;
        } else {
          return true;
        }
      });
    });
    return selectedLinks;
  };

  this.nameThisLink = function (link) {
    return nameThisLink(link);
  };

  var nameThisLink = function (link) {
    return link.colour + " " + link.lower + "↔" + link.higher;
  };
}

function ESPSystem(cmd, queryGraph) {
  this.fetchGroups = function (systemsForCIRQuery, groupsForCIRQuery) {
    //move query graph outside of the tabs
    queryGraph.reset();

    var motivations = [];
    //exclude from direct matches the groups for which the system is not toggled as those groups
    //are not visible as selected on the UI but their statue remains thus in the groupsForCIRQuery construct
    var directMatchesToConsider = [];
    groupsForCIRQuery.array().forEach(function (selectedGroup) {
      const group = cmd.getGroup(selectedGroup);
      if (systemsForCIRQuery.values().has(group.EUISID)) {
        directMatchesToConsider.push(group);
      }
    });

    if (directMatchesToConsider.length > 0) {
      const linksToReturn = cmd.followLinks(
        directMatchesToConsider.map((g) => g.IGID),
        systemsForCIRQuery.array(),
      );

      respondWith({
        links: linksToReturn,
        directMatches: directMatchesToConsider,
      });

      const links = cmd.getLinks(linksToReturn);
      const filteredFilesFromLinks = cmd.getFilesFromLinks(links);
      const filteredFilesFromDirectMatches = cmd.getFilesFromGroups(directMatchesToConsider.map((g) => g.IGID));

      queryGraph.graphThis(queryGraph.buildGraphData(cmd.mergeResultFiles(filteredFilesFromDirectMatches, filteredFilesFromLinks), links));
    } else {
      motivations.push("you didn't select a group");
      respondWith("no results found");
    }
    motivateResponseWith(motivations);
  };

  this.fetchLink = function () {
    queryGraph.reset();
    var querytype = currentValue("LMFQueryTypes");
    var motivations = [];
    var queriedLink = currentValue("queriedLink");
    var link = cmd.getLink(queriedLink);
    if (ifdef(link)) {
      if (querytype == "YLR1" || querytype == "YLR2") {
        //if not verifying authority then the profile cannot be used
        if (!idget("asVerifierOfTheLink").checked) {
          respondWith("access denied");
          motivations.push("if you are not going to be the verifying authority then YLR QTs cannot be used");
        } else {
          motivations.push("you are the verifying authority");
          if (querytype == "YLR1") {
            var linksToReturn = [];

            if (link.colour == "YL") {
              linksToReturn.push(...cmd.getRelationOf(link));
              motivations.push("link " + cmd.nameThisLink(link) + " is currently yellow, full relationship is returned.");
            } else {
              linksToReturn.push(link);
              motivations.push("link " + cmd.nameThisLink(link) + " is " + link.colour + ", as the verifying authority access to that link only is granted.");
            }

            respondWith({
              links: linksToReturn,
              lowerGroup: cmd.getGroup(link.lower),
              higherGroup: cmd.getGroup(link.higher),
            });
            //build files from the found results

            const filteredFiles = cmd.getFilesFromLinks(linksToReturn);
            queryGraph.graphThis(queryGraph.buildGraphData(filteredFiles, linksToReturn));
          } else {
            //querytype == 'YLR2'

            if (link.colour == "YL") {
              //walk all paths between the 2 groups of link which are not direct
              motivations.push("link " + cmd.nameThisLink(link) + " is currently yellow");
              var indirectPaths = cmd.indirectLinksOf(link, false);
              if (indirectPaths.length > 0) {
                motivations.push("access to link " + cmd.nameThisLink(link) + " is granted, here are the link participating in the indirect paths between group " + link.lower + " and group " + link.higher);
                motivations.push("We've added to the graph " + cmd.nameThisLink(link) + " plus the other non-yellow links of it relationship if any, if that's all there is to see it means there are no indirect paths.");
                respondWith(indirectPaths);

                var links = cmd.getLinks(indirectPaths);
                var filteredFiles = cmd.getFilesFromLinks(links);
                queryGraph.graphThis(queryGraph.buildGraphData(filteredFiles, links));
              } else {
                //we shouldn't come here anymore, as we now include the source link in the response
                motivations.push("access to link " + cmd.nameThisLink(link) + " is granted, but there are no indirect paths between group " + link.lower + " and group " + link.higher);
                respondWith("no indirect paths");
              }
            } else {
              motivations.push("link " + cmd.nameThisLink(link) + " is " + link.colour + ", you can only use a YLR 2nd step query on a yellow link.");
              respondWith("access denied");
            }
          }
          //TODO if system access then run DMF query (+linked matches again) on the basis of the groups found
        }
      } else if (querytype == "RL") {
        if (link.colour == "MRL" || link.colour == "NMRL") {
          motivations.push("link " + cmd.nameThisLink(link) + " is " + link.colour + ", link is returned but not the relationship");

          respondWith({
            links: [link],
            lowerGroup: cmd.getGroup(link.lower),
            higherGroup: cmd.getGroup(link.higher),
          });
          //build files from the found results

          const filteredFiles = cmd.getFilesFromLinks([link]);
          queryGraph.graphThis(queryGraph.buildGraphData(filteredFiles, [link]));
        } else {
          motivations.push("link " + cmd.nameThisLink(link) + " is " + link.colour + ", you can only use a RLl query on a red link.");
          respondWith("access denied");
        }
      } else if (querytype == "R1" || querytype == "R2") {
        if (link.colour == "YL") {
          motivations.push("link " + cmd.nameThisLink(link) + " is " + link.colour + ", you can only access it using an YLR profile and not a rectification profile.");
          respondWith("access denied");
        } else {
          motivations.push("link " + cmd.nameThisLink(link) + " is not yellow");
          if (querytype == "R1") {
            motivations.push("access to link " + cmd.nameThisLink(link) + " granted.");

            respondWith({
              links: [link],
              lowerGroup: cmd.getGroup(link.lower),
              higherGroup: cmd.getGroup(link.higher),
            });
            //build files from the found results

            const filteredFiles = cmd.getFilesFromLinks([link]);
            queryGraph.graphThis(queryGraph.buildGraphData(filteredFiles, [link]));
          } else {
            //querytype == 'R2'

            //walk all paths between the 2 groups of link which are not direct
            var indirectPaths = cmd.indirectLinksOf(link, true);
            if (indirectPaths.length > 0) {
              motivations.push("access to link " + cmd.nameThisLink(link) + " granted, here are the link participating in the indirect paths between group " + link.lower + " and group " + link.higher);
              motivations.push(" We've added to the graph " + cmd.nameThisLink(link) + ", if that's all there is to see then it means there are no indirect path.");
              respondWith(indirectPaths);

              //build files and links from the found results
              var links = cmd.getLinks(indirectPaths);
              var filteredFiles = cmd.getFilesFromLinks(links);
              queryGraph.graphThis(queryGraph.buildGraphData(filteredFiles, links));
            } else {
              motivations.push("access to link " + cmd.nameThisLink(link) + " is granted, but there are no indirect paths between group " + link.lower + " and group " + link.higher);
              respondWith("no indirect paths");
            }
            //TODO if system access then run DMF query (+linked matches again) on the basis of the groups found
          }
        }
      } else {
        respondWith("error");
        motivations.push("querytype " + querytype + " not yet supported");
      }
    } else {
      motivations.push("you need to have at least a link to use the queries of this panel");
      respondWith("error");
    }

    motivateResponseWith(motivations);
  };

  var respondWith = function (value) {
    printForUser("MIDQueryResult", "response", value);
  };

  var motivateResponseWith = function (motivations) {
    var list = "<p>Motivations:<ul>";
    motivations.forEach(function (motivation) {
      list += "<li>" + motivation + "</li>";
    });
    list += "</ul></p>";
    idget("MIDQueryMotivations").innerHTML = list;
  };

  this.reset = function () {
    queryGraph.reset();
    idget("MIDQueryResult").innerHTML = "";
    idget("MIDQueryMotivations").innerHTML = "";
  };

  this.queryTypeSelected = function () {
    var querytype = currentValue("LMFQueryTypes");
    if (querytype == "YLR1" || querytype == "YLR2") {
      show("verifyingAuthority");
    } else {
      hide("verifyingAuthority");
    }
  };
}

function SelectedValues() {
  const selectedValues = new Set();

  this.toggle = function (selectedValue) {
    if (selectedValues.has(selectedValue)) {
      selectedValues.delete(selectedValue);
    } else {
      selectedValues.add(selectedValue);
    }
  };

  this.values = function () {
    return selectedValues;
  };
  this.array = function () {
    return Array.from(selectedValues.values());
  };
  this.reset = function () {
    selectedValues.clear();
  };
}

function StorageSystem(cmd) {
  var localstorage_entry_point = "LS_CMD_STATES";

  this.saveState = function (inputName, selectToRefreshName) {
    var stateName = idget(inputName);
    localStorage.setItem(stateName.value, cmd.jsonRepresentation());
    saveStateName(stateName.value);
    this.refreshStatesList(selectToRefreshName);
  };

  var saveStateName = function (name) {
    var statesNames = getStatesList();
    statesNames.add(name);
    localStorage.setItem(localstorage_entry_point, JSON.stringify(statesNames, JSONStringifyReplacer));
  };

  var getStatesList = function () {
    //returns a Set
    if (localStorage.getItem(localstorage_entry_point) == null) {
      localStorage.setItem(localstorage_entry_point, JSON.stringify(new Set(), JSONStringifyReplacer));
    }
    return JSON.parse(localStorage.getItem(localstorage_entry_point), JSONStringifyReviver);
  };

  this.refreshStatesList = function (selectName) {
    var select = idget(selectName);
    cleanSelect(select);
    var statesNames = getStatesList();
    statesNames.forEach(function (stateName) {
      var option = document.createElement("option");
      option.text = stateName;
      select.add(option);
    });
  };

  this.loadData = function (selectWithStateToLoadName, idOfInputToSaveState) {
    const stateToLoad = currentValue(selectWithStateToLoadName);
    esp.reset();
    cmd.reloadWith(localStorage.getItem(stateToLoad), true);
    idget(idOfInputToSaveState).value = stateToLoad;
  };

  this.importAsCurrent = function () {
    esp.reset();
    cmd.reloadWith(idget("importExportState").value, true);
  };

  this.exportCurrentState = function () {
    idget("importExportState").value = cmd.jsonRepresentation();
  };

  this.resetState = function () {
    esp.reset();
    cmd.resetState();
  };
}

//when instanciation a D3ForceGraph the
var stateGraph = new D3ForceGraph("graph-container", 3, 2);
var queryGraph = new D3ForceGraph("query-graph-container", 2, 3);
var systemsForMIDQuery = new SelectedValues();
var systemsForCIRQuery = new SelectedValues();
var groupsForCIRQuery = new SelectedValues();
var cmd = new CMDSystem(stateGraph, systemsForMIDQuery, systemsForCIRQuery, groupsForCIRQuery);
var esp = new ESPSystem(cmd, queryGraph);
var storage = new StorageSystem(cmd);

storage.refreshStatesList("selectedSavedState");
//init add IG button
idget("addIGButton").innerHTML = "add identity group " + cmd.getNextIGIDForButton();

idget("addSystemButton").innerHTML = "add system " + cmd.getNextSystemIDForButton();

doOnClick("addSystemButton", function () {
  cmd.addSystem("addSystemButton");
});

doOnClick("saveData", function () {
  storage.saveState("stateName", "selectedSavedState");
});

doOnClick("loadData", function () {
  storage.loadData("selectedSavedState", "stateName");
});

doOnClick("addIGButton", function () {
  cmd.addIG("addIGButton");
});

doOnClick("addLinkButton", function () {
  cmd.addLink();
});

doOnClick("LMFquery", function () {
  esp.fetchLink();
});
doOnClick("DMFquery", function () {
  esp.fetchGroups(systemsForCIRQuery, groupsForCIRQuery);
});
doOnClick("importLoadedState", function () {
  storage.importAsCurrent();
});
doOnClick("resetState", function () {
  storage.resetState();
});
doOnClick("exportCurrentState", function () {
  storage.exportCurrentState();
});

idget("leftIG").onchange = function () {
  cmd.leftIGChosen();
};

idget("rightIG").onchange = function () {
  cmd.rightIGChosen();
};

addEventListener("popstate", function (e) {
  cmd.reloadStateFromUrl();
});

addEventListener("load", function (e) {
  console.log("loading done!");
  cmd.reloadStateFromUrl();
});

idget("LMFQueryTypes").onchange = function () {
  esp.queryTypeSelected();
};
