# angular-google-maps-tsp
Angular wrapper for the TSP Solver located at: https://github.com/tzmartin/Google-Maps-TSP-Solver

If you've ever needed to use Google Map's directions API with the `optimizeRoute` option, you know that there is a limit to the number of waypoints you can have on your route.  The wonderful code by Geir Engdahl and James Tolley allows us to solve the Travelling Salesman Problem with an unlimited number of waypoints.  This module simply provides a wrapper that allows you to use their code in the "angular way" of services and promises.


### Installation
```
bower install angular-google-maps-tsp --save
```

### Usage
**1. Add `gmaps.tsp` as module dependency.**
```
angular.module('myModule', ['gmaps.tsp']);
```

**2. Inject `GoogleMapsTSP` service.**
```
angular.module('myModule')
  .controller('MyController', ['$scope', 'GoogleMapsTSP', function($scope, GoogleMapsTSP){ ... }]);
```

**3. Configure the request with waypoints**
```
var config = {
	waypoints: []
};
for(var i=0; i < $scope.markers.length; i++){
	config.waypoints.push( {
		label: $scope.markers[i].label,
		position: new google.maps.LatLng($scope.markers[i].latitude, $scope.markers[i].longitude) 
	});
}
```

**4. Calculate route!**
```
GoogleMapsTSP.solveAtoZ(config)
					.then( directionsCalculated )
					.catch( directionsFailed )
					.finally( directionsFinished );
```
for round trip, use:
```
GoogleMapsTSP.solveRoundTrip(config)
					.then( directionsCalculated )
					.catch( directionsFailed )
					.finally( directionsFinished );
```
*see the example for sample callbacks*

### Configuration
#### Configuration Options
* avoidHighways *(boolean)*
* avoidTolls *(boolean)*
* travelMode *(see: https://developers.google.com/maps/documentation/javascript/reference#TravelMode)*
* unitSystem *(see: https://developers.google.com/maps/documentation/javascript/reference#UnitSystem)*
* waypoints *(array of waypoint definitions)*

#### Waypoint Definitions

A waypoint can be defined as a string or object.

If it is a string, it will be geocoded as an address.

Objects are handled as follows:
  * If the object has an `address` property, the address will be geocoded.
  * If the object has a `position` property, the position property must be a `google.maps.LatLng` object.
  * If the object has a `label` property, it will be added to the TspSolver's label list. (available with `tsp.getLabels()`)
  * If the object has neither `address` or `position` properties, it is assumed to be a `google.maps.LatLng` object.

*Note that in calculating the route, some waypoints may be moved to be accessible by the specified travel mode. This is a normal behaviour of Google Maps.*

#### Configuring Defaults

Route request defaults can be configured in two ways:

1. in `config()`, using `GoogleMapsTSPProvider.setDefaults({ ... })`
2. at run-time, using `GoogleMapsTSP.setDefaults({ ... })`
