angular.module('gmaps.tsp.demo', ['gmaps.tsp', 'uiGmapgoogle-maps'])
.config(['GoogleMapsTSPProvider', 'uiGmapGoogleMapApiProvider', function(GoogleMapsTSPProvider, GoogleMapApiProviders){
	GoogleMapsTSPProvider.setDefaults({
	});

	GoogleMapApiProviders.configure({
//		key: 'YOUR_API_KEY'
	});
}])
.run(['GoogleMapsTSP', 'uiGmapGoogleMapApi', function(GoogleMapsTSP, uiGmapGoogleMapApi){
	// certain defaults can only be set at run-time (after Google Maps API is loaded)
	uiGmapGoogleMapApi.then(function(){
		GoogleMapsTSP.setDefaults({
			travelMode: google.maps.TravelMode.BICYCLING
		});
	});
}])
.controller('DemoController', ['$scope', 'GoogleMapsTSP', '$interval', function($scope, GoogleMapsTSP, $interval){
	$scope.map = {
		center: { latitude: 45, longitude: -73 },
		zoom: 12, 
		control: {},
		bounds: {}
	};

	var directionsPanel = document.querySelectorAll('.directions');
	if(directionsPanel && directionsPanel.length){
		directionsPanel = directionsPanel[0];
	}

	$scope.markerCount = 4;
	$scope.roundTrip = false;

	var directionsDisplay;

	$scope.generateMarkers = function(){
		$scope.markers = [];
		resetDirections();

		// generate some random markers inside the map's current bounds
		var bounds = $scope.map.bounds;
		var lat_min = bounds.southwest.latitude,
			lat_range = bounds.northeast.latitude - lat_min,
			lng_min = bounds.southwest.longitude,
			lng_range = bounds.northeast.longitude - lng_min;

		var iconUrlBase = "https://mts.googleapis.com/maps/vt/icon/name=icons/spotlight/spotlight-waypoint-a.png&psize=16&font=fonts/Roboto-Regular.ttf&ax=44&ay=48&scale=1&color=ff333333"
		for(var i=0; i < $scope.markerCount; i++){
			var newMarker = {
				id: i,
				label: '#'+i,
				latitude: lat_min + (Math.random() * lat_range),
				longitude: lng_min + (Math.random() * lng_range)
			};

			$scope.markers.push(newMarker);
		}
	};

	function resetDirections(){
		$scope.hasDirections = false;
		$scope.directionMarkers = [];

		if(angular.isDefined(directionsDisplay)){
			directionsDisplay.setMap(null);
			directionsDisplay.setPanel(null);
		}
	}

	// directions calculated callback
	function directionsCalculated(tsp){
		var map = $scope.map.control.getGMap();
		if(map){
			// create a DirectionsRenderer
			if(angular.isUndefined(directionsDisplay)){
				// suppress markers and infoWindows because we will be making our own
				directionsDisplay = new google.maps.DirectionsRenderer({ suppressMarkers: true, suppressInfoWindows: true });
			}

			// check the Google-Maps-TSP-Solver/BpTspSolver.js source for functions that are available on tsp ...
			// ex. tsp.getOrder()

			var directions = tsp.getGDirections();

			// add the directions to the map
			directionsDisplay.setMap(map);
			directionsDisplay.setDirections(directions);

			// add the directions to the details panel
			if(directionsPanel){
				directionsDisplay.setPanel(directionsPanel);

				// short poll to wait for the directions panel to be rendered
				var checkForRender = $interval(function(){
					// consider it rendered when a child is found
					if(directionsPanel.childNodes.length){
						// stop the poll
						$interval.cancel(checkForRender);
						checkForRender = undefined;

						// just for fun, customize the markers
						customizeDirectionMarkers(tsp);
					}
				}, 50, 20);
			}

			$scope.hasDirections = true;
		}
	}
	function directionsFailed(error){
		alert('Could not calculate directions.\n\n'+(error.code ? '['+error.code+'] ' : '')+error.message);
	}
	function directionsFinished(){
		$scope.calculating = GoogleMapsTSP.isSolving();
	}
	$scope.calculateDirections = function(roundTrip){
		if($scope.markers && $scope.markers.length){
			resetDirections();
			$scope.calculating = true;

			// configure the waypoints
			var config = {
				waypoints: []
			};
			// copy all markers in as waypoints
			for(var i=0; i < $scope.markers.length; i++){
				config.waypoints.push( {
					label: $scope.markers[i].label,
					position: new google.maps.LatLng($scope.markers[i].latitude, $scope.markers[i].longitude) 
				});
			}

			if(roundTrip){
				GoogleMapsTSP.solveRoundTrip(config)
					.then(directionsCalculated)
					.catch(directionsFailed)
					.finally(directionsFinished);
			}
			else{
				GoogleMapsTSP.solveAtoZ(config)
					.then(directionsCalculated)
					.catch(directionsFailed)
					.finally(directionsFinished);
			}
		}
		else {
			directionsFailed({message: 'No markers!', code: 'NO_MARKERS'});
		}
	};

	// the following functions are for customizing the direction markers (on the map + in the directions panel)
	function customizeDirectionMarkers(tsp){
		var directionPlaces = jQuery(directionsPanel).find('.adp-placemark');
		for(var i=0; i < directionPlaces.length; i++){
			customizeDirectionMarker(tsp, i, jQuery(directionPlaces[i]));
		}
	}
	function customizeDirectionMarker(tsp, index, element){
		// extract the location and address from the direction route's legs
		var directions = tsp.getGDirections();
		var location, address;
		if(directions.routes && directions.routes.length){
			var route = directions.routes[0];
			if(route.legs){
				if(index < route.legs.length){
					location = route.legs[index].start_location;
					address = route.legs[index].start_address;
					last = false;
				}
				else if(index == route.legs.length){
					location = route.legs[index-1].end_location;
					address = route.legs[index-1].end_address;
					last = true;
				}
			}
		}

		// create the marker
		if(location){
			var marker;
			var icon = 'https://mts.google.com/vt/icon?psize=20&font=fonts/Roboto-Regular.ttf&color=ff330000&name=icons/spotlight/spotlight-waypoint-a.png&ax=44&ay=48&scale=1&text='+(index+1);
			if(!$scope.roundTrip || !last){
				marker = {
					id: 'directions-'+index,
					latitude: location.lat(),
					longitude: location.lng(),
					icon: icon,
					click: function(){
						// close the other info windows
						for(var i=0; i < $scope.directionMarkers.length; i++){
							if($scope.directionMarkers[i] != this){
								$scope.directionMarkers[i].show = false;
							}
						}

						// open this marker's info window
						this.show = true;
						$scope.$apply(); // google maps doesn't use ng-click, so we need to $scope.$apply() the changes
					},
					show: false,
					content: (address ? address : location.lat()+','+location.lng())
				};

				// add the directionMarker 
				$scope.directionMarkers.push(marker);
			}
			else if($scope.roundTrip && last){
				// for round trip, re-use first marker
				marker = $scope.directionMarkers[0];
			}

			// handle clicking on the address in the directions panel
			element.parent().on('click', function(event){
				event.stopPropagation();
				marker.click();
			});

			// inject the custom icon into the directions panel
			element.find('.adp-marker').attr('src', icon);
		}
	}
}]);
