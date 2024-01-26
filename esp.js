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
function show(showroom, name, data) {
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

/*
function setQuery(id, json) {
  doOnClick(id, function () {
    idget("query").innerHTML = tojson(json);
  });
}
*/

function CMDSystem(graph) {
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
    //TODO show per system colour in the select -> need to use emojis and their
    //limitations in terms of colours... https://blog.jim-nielsen.com/2021/styling-select-option-values/
    systems.push(nextSystemID);
    refreshSystemsOfGroupList();
    show("systemsShowroom", "systems", systems);
    nextSystemID++;
    idget(buttonId).innerHTML = "add system " + nextSystemID;
  };

  var refreshSystemsOfGroupList = function () {
    var select = idget("systemOfGroup");
    cleanSelect(select);
    systems.forEach(function (system) {
      var systemOption = document.createElement("option");
      systemOption.text = system;
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
      show("systemsShowroom", "systems", systems);
      show("groupsShowroom", "individual files", files);
      nextIGID++;
      nextIFID++;
      idget(buttonId).innerHTML = "add identity group " + nextIGID;
      regraph();
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
    var leftGroup = group(currentlyOnLeft).group;
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

    show("systemsShowroom", "systems", systems);
    show("linksShowroom", "links", links);
    show("groupsShowroom", "individual files", files);
    refreshRightIGList();
    refreshLinkColoursList();
    refreshQueriableLinksList();
    regraph();
  };

  var refreshSystemsLists = function () {
    refreshSystemsListForShow();
    refreshSystemsListForMIDQuery();
  };

  var refreshSystemsListForShow = function () {
    const span = idget("systemsListForShow");
    span.innerHTML = "";
    var atLeastOneSystem = false;

    systems.forEach(function (system) {
      if (!atLeastOneSystem) {
        const option = document.createElement("span");
        option.innerHTML = "currently defined systems are: ";
        span.appendChild(option);
        atLeastOneSystem = true;
      }
      var option = document.createElement("span");
      option.innerHTML = "system " + system;
      option.className = "badge";
      option.style.cssText = "background-color:" + graph.getColorForEUIS(system);
      const space = document.createElement("span");
      space.innerHTML = " ";
      span.appendChild(space);
      span.appendChild(option);
    });
  };

  var refreshSystemsListForMIDQuery = function () {
    var span = idget("systemsListForMIDQuery");
    span.innerHTML = "";

    systems.forEach(function (system) {
      var option = document.createElement("div");
      option.className = "form-check form-switch";
      option.innerHTML = '<input class="form-check-input" type="checkbox" role="switch" id="system' + system + 'MIDQueryOption"> <label class="form-check-label" for="system' + system + 'MIDQueryOption">' + system + "</label>";
      span.appendChild(option);
    });
  };
  var refreshQueriableLinksList = function () {
    var select = idget("queriedLink");
    cleanSelect(select);
    links.forEach(function (link) {
      var option = document.createElement("option");
      option.text = link.ID;
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

  var group = function (groupID) {
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
      //TODO cam this test be removed? this should never happen since we exclude the link outright, should this (and the returned boolean) remain?
      loge(leftIG + " and " + rightIG + " are already in the same file " + leftIfId + ", they cannot be kept in different files anymore. ");
      return false;
    } else {
      //TODO excludedGroups will contain duplicates over time, not an issue but
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

  this.reloadWith = function (rawState) {
    var state = JSON.parse(rawState, JSONStringifyReviver);
    files = state.files;
    systems = state.systems;
    links = state.links;
    nextSystemID = state.nextSystemID;
    nextIGID = state.nextIGID;
    nextIFID = state.nextIFID;
    nextLinkID = state.nextLinkID;

    show("systemsShowroom", "systems", systems);
    show("linksShowroom", "links", links);
    show("groupsShowroom", "individual files", files);
    refreshLeftIGList();
    refreshRightIGList();
    refreshLinkColoursList();
    refreshSystemsOfGroupList();
    refreshQueriableLinksList();
    refreshSystemsLists();
    idget("addSystemButton").innerHTML = "add system " + nextSystemID;
    idget("addIGButton").innerHTML = "add identity group " + nextIGID;
    regraph();
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
    return group(groupID).group;
  };

  this.indirectLinksOf = function (link) {
    //from lower to higher
    //console.log("looking for all indirect links from " + link.lower + " to " + link.higher);
    var linksWeDoNotWantToSee = [];
    //the links of the relation is not strictly required when doing 2nd step
    //query (because 1st step will have provided it), but it help provide a context to the graph
    //in this particular simulation, commenting out for now
    /*
    this.getRelationOf(link).forEach(function (linkOfTheRelation) {
      linksWeDoNotWantToSee.push(linkOfTheRelation.ID);
    });
    */
    var allPaths = indirectLinksOf(link.higher, link.lower, null, [], [], 2, linksWeDoNotWantToSee);
    //same as above, the yellow link being the query input is not strictly
    //required to be returned, but it helps the simulation work better
    allPaths.push(link.ID);
    //allPaths may contain duplicates in case of indirect paths sharing a common trunk
    return Array.from(new Set(allPaths).values());
  };

  //recursive call, exploring all links as potential cycling graphs
  //keeping track of the links and groups up to that point to avoid cycling.
  //Once a branch of the recursive call reach the target all the past link
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
    var hitLinkAtTheEnd;
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
          //TODO check if next test is still required, as we are checking all
          //groups from the past now
          if (!isOneOf(link.ID, linksLeadingToThisPoint)) {
            //excluding the link we just called from
            //TODO check if next test is still required, as we are checking all links from the past now
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

  this.getGroupsFromLinks = function (selectedLinks) {
    function insertIfNotKnown(filteredFiles, groupAndIfId) {
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
    }

    const filteredFiles = new Map();
    selectedLinks.forEach(function (link) {
      insertIfNotKnown(filteredFiles, group(link.lower));
      insertIfNotKnown(filteredFiles, group(link.higher));
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
}

function ESPSystem(cmd, queryGraph) {
  this.fetchLink = function () {
    queryGraph.reset();
    var querytype = currentValue("LMFQueryTypes");
    var motivations = [];
    if (querytype == "YLR1" || querytype == "YLR2") {
      //if not verifying authority then the profile cannot be used
      if (!idget("asVerifierOfTheLink").checked) {
        respondWith("error");
        motivations.push("YLR1 QT cannot be used without being the verifying authority");
      } else {
        var queriedLink = currentValue("queriedLink");
        var link = cmd.getLink(queriedLink);
        if (querytype == "YLR1") {
          var linksToReturn = [];

          if (link.colour == "YL") {
            linksToReturn.push(...cmd.getRelationOf(link));
            motivations.push("link " + link.ID + " is currently yellow, full relationship is returned.");
          } else {
            linksToReturn.push(link);
            motivations.push(
              "link " + link.ID + " is " + link.colour + ", but you are using a YLR query type so it shouldn't work but you were the verifying authority so it does. Only the full relationship is not returned since the link is not yellow anymore.",
            );
          }

          respondWith({
            links: linksToReturn,
            lowerGroup: cmd.getGroup(link.lower),
            higherGroup: cmd.getGroup(link.higher),
          });
          //build files from the found results

          const filteredFiles = cmd.getGroupsFromLinks(linksToReturn);
          queryGraph.graphThis(queryGraph.buildGraphData(filteredFiles, linksToReturn));
        } else {
          //querytype == 'YLR2'

          if (link.colour == "YL") {
            //walk all paths between the 2 groups of link which are not direct
            var indirectPaths = cmd.indirectLinksOf(link);
            if (indirectPaths.length > 0) {
              motivations.push(
                "link " +
                  link.ID +
                  " is currently yellow, here are the link participating in the indirect paths between group " +
                  link.lower +
                  " and group " +
                  link.higher +
                  ". Added to the graphs are " +
                  link.ID +
                  " plus the other links of it relationship",
              );
              respondWith(indirectPaths);

              //build files and links from the found results
              var links = cmd.getLinks(indirectPaths);
              var filteredFiles = cmd.getGroupsFromLinks(links);
              queryGraph.graphThis(queryGraph.buildGraphData(filteredFiles, links));
            } else {
              motivations.push("link " + link.ID + " is currently yellow, but there are no indirect paths between group " + link.lower + " and group " + link.higher);
              respondWith("no indirect paths");
            }
          } else {
            motivations.push("link " + link.ID + " is " + link.colour + ", you can only use a YLR 2nd step query on a yellow link.");
            respondWith("error");
          }
        }
        //TODO if system access then run DMF query (+linked matches again) on the basis of the groups found
      }
    } else {
      respondWith("error");
      motivations.push("querytype " + querytype + " not yet supported");
    }

    motivateResponseWith(motivations);
  };

  var respondWith = function (value) {
    show("MIDQueryResult", "response", value);
  };

  var motivateResponseWith = function (motivations) {
    var list = "<p>Motivations:<li>";
    motivations.forEach(function (motivation) {
      list += "<ul>" + motivation + "</ul>";
    });
    list += "</li></p>";
    idget("MIDQueryMotivations").innerHTML = list;
  };

  this.reset = function () {
    queryGraph.reset();
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
    cmd.reloadWith(localStorage.getItem(stateToLoad));
    idget(idOfInputToSaveState).value = stateToLoad;
  };

  this.importAsCurrent = function () {
    esp.reset();
    cmd.reloadWith(idget("importExportState").value);
  };

  this.exportCurrentState = function () {
    idget("importExportState").value = cmd.jsonRepresentation();
  };

  this.resetState = function () {
    //a bit ugle
    esp.reset();
    cmd.reloadWith('{"nextSystemID":0,"nextIGID":0,"nextIFID":0,"nextLinkID":0,"files":{"dataType":"Map","value":[]},"systems":[],"links":[]}');
  };
}

//when instanciation a D3ForceGraph the
var stateGraph = new D3ForceGraph("graph-container", 3, 2);
var queryGraph = new D3ForceGraph("query-graph-container", 2, 3);
var cmd = new CMDSystem(stateGraph);
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
