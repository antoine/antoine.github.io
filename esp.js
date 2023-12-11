//"use strict";
//console.log("as");


function idget(id) {
  return document.getElementById(id);
}

function tojson(ob) {
  return JSON.stringify(ob, null, 2);
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
/*
//configuring
idget("esp_config").innerHTML = tojson({
  profiles: {
    profile_1: {
      STBQs: ["BDP1"],
      STPRs: ["BDP1"],
      contextes: [{ operation: "operation_A", variant: "variant_a" }],
    },
  },

  level_of_identity_management: {
    BDP1: "group",
    BDP2: "identity",
  },
});
*/
//idget("cir_config").innerHTML = tojson({});
//TODO add concept of individual file
/*
idget("cir_data").innerHTML = tojson([
  {
    individual_file: uuidv4(),
    groups: [
      {
        owner: "BDP1",
        owner_group_reference: "gref1",
        items: [{ owner_identity_reference: "iref1", data: "identity A" }],
      },
    ],
  },
  {
    individual_file: uuidv4(),
    groups: [
      {
        owner: "BDP1",
        owner_group_reference: "gref2",
        items: [{ owner_identity_reference: "iref2", data: "identity B" }],
      },
      {
        owner: "BDP2",
        owner_group_reference: "gref1",
        items: [{ owner_identity_reference: "iref1", data: "identity C" }],
      },
    ],
  },
]);
*/
//TODO add links data
/*
idget("mid_data").innerHTML = tojson([
  {
    existing_group: {
      owner: "BDP1",
      owner_group_reference: "gref2",
    },
    new_group: {
      owner: "BDP2",
      owner_group_reference: "gref1",
    },
    original_type: "white",
  },
]);
*/
/*
setQuery("query1", {
  profile: "profile_1",
  operation: "operation_A",
  variant: "variant_a",
  params: { CIR: { firstname: "antoine" } },
});
setQuery("query2", {
  profile: "profile_1",
  operation: "operation_A",
  variant: "variant_a",
  params: { BDP1: { VSN: "1ASD1231" } },
});
//loading a query by default
idget("query1").click();
*/

//ESP executor
//function ESPSystem(config, systems) {
function ESPSystem() {

    var nextIGID = 0;
    var nextIFID = 0;
    var groups = [];
    var links = [];

    this.addIG = function() {
        nextIGID ++;
        nextIFID ++;
        groups.push({IGID:nextIGID, IFID:nextIFID});
        refreshLeftIGList();
        refreshRightIGList();
        show("groupsShowroom", groups);
    };

    this.leftIGChosen= function() {
        refreshRightIGList();
    };

    this.addLink = function() {
        var colour = currentValue ("linkColour");
        var currentlyOnLeft = currentValue ("leftIG");
        var currentlyOnRight = currentValue ("rightIG");
       links.push ({colour:colour, left:currentlyOnLeft, right:currentlyOnRight}); 
        show("linksShowroom", links);
    };

    var currentValue = function(selectId) {
        var leftIGs= idget(selectId);
        return leftIGs.options[leftIGs.selectedIndex].value;
    };

    var refreshLeftIGList = function() {
        var select = idget("leftIG");
       cleanSelect(select); 
       groups.forEach(function(freeGroup) {
       var groupOption = document.createElement("option"); 
       groupOption.text = freeGroup.IGID;
       select.add(groupOption);
       });
    };

    var refreshRightIGList = function() {
        var currentlyOnLeft = currentValue ("leftIG");
        var select = idget("rightIG");
       cleanSelect(select); 
       groups.forEach(function(freeGroup) {
            
            if (freeGroup.IGID != currentlyOnLeft) {
           var groupOption = document.createElement("option"); 
           groupOption.text = freeGroup.IGID;
           select.add(groupOption);
           }
       });
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



    /*
  this.run = function (params) {
    //log(params);

    var usedSystems = internal.validateInputAndLoadSystems(params);
    if (usedSystems === undefined) {
      loge("ESP query validation failed");
    } else {
      log("loaded profile configuration");
      log("STBQs");
      log(usedSystems.STBQs);
      log("STPRs");
      log(usedSystems.STPRs);
      //distribute the search parameters to the systems
      //only supports non-fusion queries for now
      var dangling_references = [];
      var link_references = [];
      //a little bit eager, querying multiple systems implies fusion but that is not covered yet
      Object.keys(params.params).forEach(function (system_to_query) {
        response = systems[system_to_query].query(
          usedSystems.STBQs,
          params.operation,
          params.variant,
          params.params[system_to_query]
        );
        log("reponse of the " + system_to_query + " query");
        logUserData(response);

        //computing the still missing references
        dangling_references = internal.computeDanglingReferences(dangling_references, response, system_to_query);
        link_references = internal.computeLinkReferences(link_references, response);
        //TODO compute the references required to pull the links from
      });
      log("dangling references:");
      log(dangling_references);
      log("potential link references:");
      log(link_references);
      //now we have received the first set of results from the "direct" query
      //load the MID links
      var links = systems.MID.loadLinks(link_references, usedSystems.STBQs, usedSystems.STPRs);
      log("links");
      log(links);
      //recompute the dangling references from the links
      //load the dangling references
    }
  };


  var internal = {
    computeLinkReferences: function (link_references, response) {
      var new_link_references = [];
      response.forEach(function (response_element) {
        if (
          !link_references.some(function (link_ref) {
            return (
              link_ref.owner == response_element.owner &&
              link_ref.owner_group_reference == response_element.owner_group_reference
            );
          })
        ) {
          new_link_references.push({
            owner: response_element.owner,
            owner_group_reference: response_element.owner_group_reference,
          });
        } else {
          log("link reference already known " + response_element.owner + "/" + response_element.owner_group_reference);
        }
      });
      return link_references.concat(new_link_references);
    },
    computeDanglingReferences: function (dangling_references, response, system_to_query) {
      var new_dangling_references = [];
      response.forEach(function (response_element) {
        found = false;
        dangling_references.forEach(function (dangling_ref) {
          if (
            dangling_ref.owner == response_element.owner &&
            dangling_ref.owner_group_reference == response_element.owner_group_reference
          ) {
            //same group, careful about identities now
            //we only want to keep the ones we don't know about yet

            var filtered_owner_identity_references = [];

            dangling_ref.owner_identity_references.forEach(function (dangling_identity_reference) {
              response_element.items.forEach(function (item) {
                if (dangling_identity_reference.owner_identity_references == item.owner_identity_reference) {
                  //it was dangling and now we found something
                  if (dangling_identity_reference.received == system_to_query) {
                    loge("received twice the same data");
                    filtered_owner_identity_references.push(dangling_identity_reference);
                  } else {
                    //removing by not adding it
                    log(
                      "removing dangling reference owned by " +
                        dangling_identity_reference.received +
                        " as its counterpart from " +
                        system_to_query +
                        " was received"
                    );
                  }
                } else {
                  filtered_owner_identity_references.push(dangling_identity_reference);
                }
              });
            });

            new_dangling_references.push({
              owner: response_element.owner,
              owner_group_reference: response_element.owner_group_reference,
              owner_identity_references: filtered_owner_identity_references,
            });
          }
        });
        if (!found) {
          new_dangling_references.push({
            owner: response_element.owner,
            owner_group_reference: response_element.owner_group_reference,
            owner_identity_references: response_element.items.map(function (item) {
              return {
                owner_identity_reference: item.owner_identity_reference,
                received: system_to_query,
              };
            }),
          });
        }
      });
      return new_dangling_references;
    },
    validateInputAndLoadSystems: function (input) {
      var log_all = function () {
        log("input");
        log(input);
        log("config");
        log(config);
      };
      //single profile only for now
      var profile = config.profiles[input.profile];
      var combination_found = false;
      if (profile === undefined) {
        loge("profile " + input.profile + " not found in ESP config");
        log_all();
      } else {
        profile.contextes.forEach(function (context) {
          if (context.operation == input.operation && context.variant == input.variant) {
            combination_found = true;
            //not checking that profile config contains the same combination multiple time
          }
        });

        if (combination_found) {
          var all_systems_queried_are_STBQs = true;
          Object.keys(input.params).forEach(function (system_to_query) {
            if (
              system_to_query != "CIR" &&
              !profile.STBQs.some(function (STBQ) {
                return STBQ == system_to_query;
              })
            ) {
              all_systems_queried_are_STBQs = false;
            }
          });
          if (all_systems_queried_are_STBQs) {
            return { STBQs: profile.STBQs, STPRs: profile.STPRs };
          } else {
            loge("attempting to query systems not listed as STBQs");
            log_all();
          }
        } else {
          loge("combination of operation/variant not known to requested profile");
          log_all();
        }
      }
    },
  };
  */
  }


function CIRSystem(config) {
  this.query = function (STBQs, STPRs, operation, variant, params) {
    var log_all = function () {
      log("STBQs");
      log(STBQs);
      log("operation/variant " + operation + "/" + variant);
      log("params");
      log(params);
    };

    //log_all();
    var data = jsonfrom("cir_data");
    //TODO XXX adapt to the individual file concept
    return data.filter(function (idgroup) {
      return STBQs.some(function (STBQ) {
        return idgroup.owner == STBQ;
      });
    });
  };
}

function MIDSystem() {
  this.loadLinks = function (links_references, STBQs, STPRs) {
    var log_all = function () {
      log("STBQs");
      log(STBQs);
      log("STPRs");
      log(STPRs);
      log("links_references");
      log(links_references);
    };

    //log_all();
    /*
    var data = jsonfrom("mid_data");
    return data.filter(function (idgroup) {
      return STBQs.some(function (STBQ) {
        return idgroup.owner == STBQ;
      });
    });
    */
    return jsonfrom("mid_data");
  };
}

/*
var esp = new ESPSystem(jsonfrom("esp_config"), {
  CIR: new CIRSystem(jsonfrom("cir_config")),
  MID: new MIDSystem(),
});
*/
var esp = new ESPSystem();

doOnClick("addIGButton", function () {
  esp.addIG();
});

doOnClick("addLinkButton", function () {
  esp.addLink();
});
idget("leftIG").onchange = function() {
    esp.leftIGChosen();
};
