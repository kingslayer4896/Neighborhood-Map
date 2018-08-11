var ViewModel = function() {
  var map;
  var lat = 40.712784;
  var long = -74.005941;
  var self = this;
  self.showMenu = ko.observable(false);
  self.isWide = ko.observable(false);
  self.location = ko.observable('New York');
  self.markers = ko.observableArray();
  self.searchPlaces = ko.observable('');

  // Toggle method to open/close the slide menu when hamburger icon is clicked
  self.toggleMenu = function() {
    if(self.showMenu() === false) {
      self.showMenu(true);
      self.isWide(true);
    } else {
      self.showMenu(false);
      self.isWide(false);
    }
  };

  // Method for initializing the map
  initMap = function() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: lat, lng: long},
      zoom: 13
    });
    self.loadData();
  };

  // This function takes the user input value via data binding, locates it, and then zooms into that area
  self.zoomToArea = function() {
    var geocoder = new google.maps.Geocoder();
    if (self.location() === '') {
      // Make sure the address isn't blank
      window.alert('You must enter an area or address.');
    } else {
      // Geocode the location entered to get the center. Then, center the map on it and zoom in and call loadData function
      geocoder.geocode({address: self.location()}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          lat = results[0].geometry.location.lat();
          long = results[0].geometry.location.lng();
          map.setCenter(results[0].geometry.location);
          map.setZoom(13);
          self.resetNeighborhood();
          self.loadData();
        } else {
          window.alert('We could not find that location. Try entering a more specific place.');
        }
      });
    }
  };

  // Method to load the data for the user entered location using foursquare API
  self.loadData = function() {
    var largeInfowindow = new google.maps.InfoWindow({maxWidth: 200});
    var bounds = new google.maps.LatLngBounds();
    var foursquareUrl = 'https://api.foursquare.com/v2/venues/explore?ll=' + lat + ',' + long + '&limit=15&section=topPicks&day=any&time=any&locale=en&client_id=IGEPZGX4AXGSMMH35UAHPN2HQRWB154PS0WJKAQIBJDWM0UH&client_secret=NNZTWKCRDFXKJPO0A4CFMKFKYKT32KJ3B0FDBQCSB0U1E3HX&v=20180810';
    // Load foursquare API data asynchronously using jquery's getJSON method
    $.getJSON(foursquareUrl).done(function(data) {
      var places = data.response.groups[0].items;
      places.forEach(function(place) {
        var plat = place.venue.location.lat;
        var plong = place.venue.location.lng;
        var marker = new google.maps.Marker({
          position: {lat: plat, lng: plong},
          map: map,
          title: place.venue.name,
          animation: google.maps.Animation.DROP,
        });
        // Push the marker to the array of markers
        self.markers.push(marker);
        // Create an click event to open an infowindow and set animation at each marker
        marker.addListener('click', function() {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          self.populateInfoWindow(this, largeInfowindow, place);
          setTimeout(function() { marker.setAnimation(null); }, 1400);  //bounce for 1400 ms
        });
        // Create a mouseover event to change the marker icon when mouse enters the area of the marker icon
        marker.addListener('mouseover', function() {
          marker.setIcon('https://mt.google.com/vt/icon?color=ff004C13&name=icons/spotlight/spotlight-waypoint-blue.png');
        });
        // Create a mouseover event to change the marker icon when mouse leaves the area of the marker icon
        marker.addListener('mouseout', function() {
          marker.setIcon('https://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-poi.png');
        });
        // Extend the boundaries of the map for each marker
        bounds.extend(marker.position);
        map.fitBounds(bounds);
      });
    }).fail(function() { // Error handling - checks if foursquare API has loaded
      window.alert('Foursquare API data could not be loaded. Please refresh the page and try again!');
    });
  };

  // This function populates the infowindow when the marker is clicked
  self.populateInfoWindow = function(marker, infowindow, place) {
    // Check to make sure the infowindow is not already opened on this marker
    if (infowindow.marker != marker) {
      infowindow.marker = marker;
      var contentString = '<h2>' + marker.title + '</h2><p class="mt0">' + place.venue.categories[0].name + '</p><p><strong>Address: </strong>' + place.venue.location.formattedAddress + '</p>';
      if (typeof place.venue.contact !== 'undefined') {
        contentString += '<p><strong>Contact: </strong>' + place.venue.contact.formattedPhone + '</p>';
      }
      if (typeof place.venue.url !== 'undefined') {
        contentString += '<p><a href = "' + place.venue.url + '" target = "_blank">' + place.venue.url + '</a></p>';
      }
      contentString += '<a href = "https://foursquare.com/" target = "_blank"><img src = "https://ss0.4sqi.net/img/poweredByFoursquare/poweredby-one-color-cdf070cc7ae72b3f482cf2d075a74c8c.png" width="200" alt="Foursquare Logo"></a>';
      infowindow.setContent(contentString);
      infowindow.open(map, marker);
      // Make sure the marker property is cleared if the infowindow is closed
      infowindow.addListener('closeclick',function(){
        infowindow.setMarker = null;
        infowindow.setContent('');
      });
    }
  };

  // Method to trigger click event on the marker corresponding to the list item clicked
  showInfo = function() {
    var place = this;
    ko.utils.arrayForEach(self.markers(), function(marker) {
      if(place.title === marker.title) {
        if($(window).width() < 500 && $(window).height() < 800){
          self.showMenu(false);
          self.isWide(false);
        }
        google.maps.event.trigger(marker, 'click');
        map.setCenter(marker.position);
      }
    });
  };

  // Filtered version of the markers based on search input via data binding
  self.filteredMarkers = ko.computed(function() {
    // Remove all markers from map
    ko.utils.arrayForEach(self.markers(), function(marker) {
      marker.setVisible(false);
    });
    // Place only the markers that match search request
    var filteredArray = [];
    filteredArray =  $.grep(self.markers(), function(a) {
      var titleSearch = a.title.toLowerCase().indexOf(self.searchPlaces().toLowerCase());
      return (titleSearch > -1);
    });
    filteredArray.forEach(function(a) {
      ko.utils.arrayForEach(self.markers(), function(marker) {
        if(marker.title === a.title) {
          marker.setVisible(true);
        }
      });
    });
    // Return list of locations that match search request, for button list
    return filteredArray;
  });

  // Method to reset the neighborhood on user input
  self.resetNeighborhood = function() {
    ko.utils.arrayForEach(self.markers(), function(marker) {
      marker.setVisible(false);
    });
    self.markers([]);
  };
};

function errorHandling() {
	alert("Google Maps has failed to load. Please try again.");
}

ko.applyBindings(new ViewModel());
