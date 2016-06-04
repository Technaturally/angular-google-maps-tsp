angular.module('gmaps.tsp', [])
.provider('GoogleMapsTSP', function(){
	var defaults = {
		avoidHighways: false,
		avoidTolls: false
	};

	// set defaults is shared between GoogleMapsTSPProvider and GoogleMapsTSP service
	function setDefaults(config){
		angular.extend(defaults, config);
	}
	this.setDefaults = setDefaults;

	this.$get = ['$q', function($q){
		var tsp;
		var activeRequest;

		function assertTspSolver(){
			if(!tsp){
				tsp = new BpTspSolver(undefined, undefined, rejectActive, rejectActive);

				// certain defaults can only be set at run-time (after Google Maps API is loaded)
				if(angular.isUndefined(defaults.travelMode)){
					defaults.travelMode = google.maps.TravelMode.DRIVING;
				}
				if(angular.isUndefined(defaults.unitSystem)){
					defaults.unitSystem = google.maps.UnitSystem.METRIC;
				}
			}
		}

		function rejectActive(tsp, errMsg, errCode){
			if(activeRequest){
				var error = {message: errMsg};
				if(angular.isDefined(errCode)){
					error.code = errCode;
				}
				activeRequest.reject(error);
				activeRequest = undefined;
			}
		}

		function resolveActive(tsp){
			if(activeRequest){
				activeRequest.resolve(tsp);
				activeRequest = undefined;
			}
		}

		function configureTSP(config){
			assertTspSolver();
			tsp.startOver();
			config = angular.extend({}, defaults, config);

			if(angular.isDefined(config.avoidHighways)){
				tsp.setAvoidHighways(config.avoidHighways);
			}
			if(angular.isDefined(config.avoidTolls)){
				tsp.setAvoidTolls(config.avoidTolls);
			}
			if(angular.isDefined(config.travelMode)){
				tsp.setTravelMode(config.travelMode);
			}
			if(angular.isDefined(config.unitSystem)){
				tsp.setDirectionUnits(config.unitSystem);
			}

			if(angular.isDefined(config.waypoints)){
				for(var i=0; i < config.waypoints.length; i++){
					if(angular.isString(config.waypoints[i])){
						tsp.addAddress(config.waypoints[i]);
					}
					else if(angular.isObject(config.waypoints[i])){
						if(angular.isDefined(config.waypoints[i].address)){
							if(angular.isDefined(config.waypoints[i].label)){
								tsp.addAddressWithLabel(config.waypoints[i].address, config.waypoints[i].label);
							}
							else{
								tsp.addAddress(config.waypoints[i].address);
							}
						}
						else if(angular.isDefined(config.waypoints[i].position)){
							if(angular.isDefined(config.waypoints[i].label)){
								tsp.addWaypointWithLabel(config.waypoints[i].position, config.waypoints[i].label);
							}
							else{
								tsp.addWaypoint(config.waypoints[i].position);
							}
						}
						else{
							tsp.addWaypoint(config.waypoints[i]);
						}
					}
				}
			}
		}

		return {
			setDefaults: setDefaults,
			getTspSolver: function(){
				return tsp;
			},
			isSolving: function(){
				return (activeRequest ? true : false);
			},
			solveAtoZ: function(config){
				var defer = $q.defer();

				if(activeRequest){
					defer.reject({message: "GoogleMapsTSP is busy.", code: 'TSP_BUSY'});
				}
				else{
					activeRequest = defer;
					configureTSP(config);
					tsp.solveAtoZ(resolveActive);
				}

				return defer.promise;
			},
			solveRoundTrip: function(config){
				var defer = $q.defer();

				if(activeRequest){
					defer.reject({message: "GoogleMapsTSP is busy.", code: 'TSP_BUSY'});
				}
				else{
					activeRequest = defer;
					configureTSP(config);
					tsp.solveRoundTrip(resolveActive);
				}

				return defer.promise;
			}
		};
	}];
});
