let map; // 整個地圖
// ■■■■ Session 1：建立 Google Map ■■■■
function initMap() {
  // 1-1 製作一個網頁，使用 Google Maps JavaScript API
  map = new google.maps.Map(document.getElementById('map'), {
    // 1-2 將地圖預設顯示臺灣
    center: { lat: 23.5, lng: 121 },
    zoom: 7,
    mapTypeControl: true,
    mapTypeControlOptions: {
      styles: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      // 1-3 底圖切換按鈕移到地圖右上角
      position: google.maps.ControlPosition.TOP_RIGHT,
      mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain', 'styled_map'],
    },
    // 1-4 顯示地圖比例尺
    scaleControl: true,
  });

  // Session 2：圖層套疊，放在此 function 之後

  // Session 3：初始化 geocoding 物件
  setGeocoding();

  // Session 4：初始化地圖監聽事件
  showPosition();

  // Session 5：初始化 DrawingManager 物件
  setDrawingManager();

  // Session 6：初始化 directionService
  setDirectionService();

  // 設計：設定其他風格的地圖
  styledMap();

  // 額外：引入 GeoJson 圖層
  myGeoJson();
}
window.initMap = initMap;

// ■■■■ Session 2：圖層套疊 ■■■■
let bigHeartMarkers = []; // 設定 marker 圖層，把所有資料放進單一 array，利於之後開關圖層
let bihHeartInfoWindow; // 設定 infoWindow 物件，只設定一個物件，避免畫面上有多個 infoWindow
$.getJSON('assets/json/marker.json', function (data) {
  bihHeartInfoWindow = new google.maps.InfoWindow();
  $.each(data, function (i) {
    // 2-1 用 each 在地圖上加入 marker
    let bihHeartMarker = new google.maps.Marker({
      position: {
        lat: data[i].Lat,
        lng: data[i].Lon,
      },
      map,
      title: data[i].Name,
      // 2-2 使用自訂圖示
      icon: 'assets/image/pin_layer.svg',
    });
    bigHeartMarkers.push(bihHeartMarker);
    // 2-3 設定顯示 infoWindow
    let bihHeartContent = `
			<div>
        <p style="font-size: 24px; font-weight: 700; margin: 0"}>${data[i].Name}</p>
        <p style="font-size: 14px; font-weight: 500; margin: 0"}>${data[i].Address}</p>
        <p style="font-size: 14px; font-weight: 500; margin: 0"}>${data[i].Tel}</p>
			</div>`;
    google.maps.event.addListener(
      bihHeartMarker,
      'click',
      (function (bihHeartMarker) {
        return function () {
          bihHeartInfoWindow.setContent(bihHeartContent);
          bihHeartInfoWindow.open(map, bihHeartMarker);
        };
      })(bihHeartMarker),
    );
  });
  // 圖層渲染完成後，先隱藏
  for (var i = 0; i < bigHeartMarkers.length; i++) {
    bigHeartMarkers[i].setMap(null);
  }
});
// 2-4 建立一個按鈕，可開關上述 marker（顯示／隱藏）
$('#BigHeart').click(() => {
  if ($('#BigHeart').prop('checked') == true) {
    for (var i = 0; i < bigHeartMarkers.length; i++) {
      bigHeartMarkers[i].setMap(map);
    }
  } else if ($('#BigHeart').prop('checked') == false) {
    for (var i = 0; i < bigHeartMarkers.length; i++) {
      bigHeartMarkers[i].setMap(null);
    }
  }
});

// ■■■■ Session 3：定位 ■■■■
let AddressGeocoder; // Geocoder 物件
let searchMarker; // Geocoder 搜尋到的點位顯示的圖層，特別設定以跟其他圖層區隔
let inputText;
function setGeocoding() {
  AddressGeocoder = new google.maps.Geocoder();
  // 建立搜尋結果圖層
  searchMarker = new google.maps.Marker({
    map: map,
    icon: 'assets/image/pin_search.svg',
  });
}
// 按下搜尋，執行 geocode
$('#submitButton').on('click', function () {
  // 3-1 使用 geocoding 取得定位結果
  inputText = $('#inputText').prop('value');
  return geocode({ address: inputText });
});
function geocode(request) {
  // 3-3 每次定位時，清除前次資料
  searchMarker.setMap(null);
  $('#inputText').removeClass('error');
  $('#inputError').css('display', 'none');
  AddressGeocoder.geocode(request)
    .then(function (result) {
      var results = result.results;
      // 3-2 定位完成後，需要在地圖上用 marker 顯示定位結果，並將地圖中心移至定位點
      map.setCenter(results[0].geometry.location);
      searchMarker.setPosition(results[0].geometry.location);
      searchMarker.setMap(map);
      return results;
    })
    // 若無法找到資料，顯示警示文字
    .catch(function (e) {
      $('#inputText').addClass('error');
      $('#inputError').css('display', 'block');
    });
}
// 按下清除，刪除搜尋結果
$('#clearButton').on('click', function () {
  searchMarker.setMap(null);
  $('#inputText').removeClass('error');
  $('#inputError').css('display', 'none');
  $('#inputText').val('');
});

// ■■■■ Session 4：熟悉常用地圖操作 ■■■■
function showPosition() {
  // 4-1 點擊地圖時取得點擊處的資訊，將經緯度、縮放尺寸顯示到畫面上
  map.addListener('click', (here) => {
    let hereLat = here.latLng.lat().toFixed(11);
    let hereLng = here.latLng.lng().toFixed(10);
    $('#hereLat').html(hereLat);
    $('#hereLng').html(hereLng);
    $('#hereZoom').html(map.zoom);
  });
  // 4-2 當地圖平移或縮放時，取得目前的地圖比例尺（Zoom Level）、地圖中心點，顯示到畫面上
  map.addListener('drag', () => {
    getCenterZoom();
  });
  map.addListener('zoom_changed', () => {
    getCenterZoom();
  });
}
function getCenterZoom() {
  let mapLat = map.center.lat().toFixed(11);
  let mapLng = map.center.lng().toFixed(10);
  $('#hereLat').html(mapLat);
  $('#hereLng').html(mapLng);
  $('#hereZoom').html(map.zoom);
}

// ■■■■ Session 5：地圖畫家 ■■■■
let all_overlays = []; // 將所有繪製的圖層放進一個陣列
function setDrawingManager() {
  // 5-1: 將繪製工具(DrawingManager)套入，包含點、線、面三種繪製模式
  let drawingManager = new google.maps.drawing.DrawingManager({
    drawingControl: false,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_LEFT,
      drawingModes: [
        google.maps.drawing.OverlayType.MARKER,
        google.maps.drawing.OverlayType.POLYLINE,
        google.maps.drawing.OverlayType.POLYGON,
      ],
    },
    markerOptions: {
      icon: 'assets/image/pin_draw.svg',
    },

    // 5-2: 設定面(Polygon)的樣式：
    // 面的邊緣顏色為紅色(#f7404f)、寬度為4
    // 面的中間不填滿 (透明度為0)
    polygonOptions: {
      fillOpacity: 0,
      strokeWeight: 4,
      strokeColor: '#f7404f',
      clickable: false,
      editable: true,
      zIndex: 1,
    },
  });
  drawingManager.setMap(map);
  // 排版：設定左側 aside 的按鈕連動 google 的 drawingControl
  $('#drawHand').on('click', function () {
    drawingManager.setDrawingMode(null);
  });
  $('#drawMarker').on('click', function () {
    drawingManager.setDrawingMode('marker');
  });
  $('#drawPolyline').on('click', function () {
    drawingManager.setDrawingMode('polyline');
  });
  $('#drawPolygon').on('click', function () {
    drawingManager.setDrawingMode('polygon');
  });
  // 5-3: 線(Polyline)繪製完成後，取得線段的坐標，並以alert顯示。
  google.maps.event.addListener(
    drawingManager,
    'polylinecomplete',
    function (polyline) {
      let strokeArray = polyline.latLngs.Vd[0].Vd;
      let alertHTML = '';
      for (let i = 0; i < strokeArray.length; i++) {
        let strokeLat = polyline.latLngs.Vd[0].Vd[i].lat().toFixed(4);
        let strokeLng = polyline.latLngs.Vd[0].Vd[i].lng().toFixed(4);
        alertHTML += `第${i + 1}點　緯度：${strokeLat}，經度：${strokeLng}\n`;
      }
      alert(alertHTML);
    },
  );
  // 將所有繪製的圖層放進一個陣列，利於刪除
  google.maps.event.addListener(
    drawingManager,
    'overlaycomplete',
    function (e) {
      all_overlays.push(e);
    },
  );
  // 5-4: 建立一個按鈕，可清除所有繪製結果
  google.maps.event.addDomListener(
    document.getElementById('clearDraw'),
    'click',
    () => {
      deleteAllShape();
      $('.drawingControl').removeClass('active');
      $('#drawHand').addClass('active');
      drawingManager.setDrawingMode(null);
    },
  );
  // 關閉繪圖的 toggle 後，drawing mode 改回手型
  const observer = new MutationObserver(function (e) {
    if (e[0].target.classList.length == 1) {
      drawingManager.setDrawingMode(null);
    }
  });
  const div = document.getElementById('drawManagerLabel');
  observer.observe(div, {
    attributes: true,
  });
}
// 刪除所有繪製結果
function deleteAllShape() {
  for (var i = 0; i < all_overlays.length; i++) {
    all_overlays[i].overlay.setMap(null);
  }
  all_overlays = [];
}
// 設定按鈕顯示
$('.drawingControl').on('click', function () {
  $('.drawingControl').removeClass('active');
  $(this).addClass('active');
});

// ■■■■ Session 6：路線規劃 ■■■■
let directionsService;
let directionGeocoder;
let destinationListener; // 設定取得開始點位的監聽器
let directionsRenderer = ''; // 設定路徑規劃的變數

let isStart = 0;
let isEnd = 0;

let destinationMarker;
let startMarker;
let endMarker;

let destinationLatLng;
let startLatLng;
let endLatLng;

let destinationInput;
let destinationError;

function setDirectionService() {
  directionsService = new google.maps.DirectionsService();
  directionGeocoder = new google.maps.Geocoder();
  startMarker = new google.maps.Marker({
    icon: 'assets/image/pin_route_a.svg',
  });
  endMarker = new google.maps.Marker({
    icon: 'assets/image/pin_route_b.svg',
  });
  // 6-1: 建立兩個按鈕，點選後可在地圖上繪製起點、終點
  $('.search_destination').on('click', (e) => {
    if (e.target.id == 'startSearch') {
      isStart = 1;
      let searchStartText = $('#startMarker').val();
      destinationGeocoder(e, searchStartText);
    } else if (e.target.id == 'endSearch') {
      isEnd = 1;
      let searchEndText = $('#endMarker').val();
      destinationGeocoder(e, searchEndText);
    }
  });
  $('.pick_destination').on('click', (e) => {
    if (e.target.id == 'startPicker') {
      if (isEnd == 1) {
        return;
      } else if (isStart == 1) {
        isStart = 0;
        $('#startPicker').removeClass('active');
        $('#endPicker').removeClass('unable');
        google.maps.event.removeListener(destinationListener);
      } else {
        isStart = 1;
        $('#startPicker').addClass('active');
        $('#endPicker').addClass('unable');
        destinationListener = map.addListener('click', (here) => {
          let destinationText = here.latLng;
          destinationGeocoder(e, destinationText);
        });
      }
    } else if (e.target.id == 'endPicker') {
      if (isStart == 1) {
        return;
      } else if (isEnd == 1) {
        isEnd = 0;
        $('#endPicker').removeClass('active');
        $('#startPicker').removeClass('unable');
        google.maps.event.removeListener(destinationListener);
      } else {
        isEnd = 1;
        $('#endPicker').addClass('active');
        $('#startPicker').addClass('unable');
        destinationListener = map.addListener('click', (here) => {
          let destinationText = here.latLng;
          destinationGeocoder(e, destinationText);
        });
      }
    }
  });
  // 6-2: 建立一個按鈕，按下時使用DirectionsService進行路徑規劃，並將結果呈現於地圖上。
  $('#drawRoute').on('click', () => {
    google.maps.event.removeListener(destinationListener);
    clearDestinationError();
    if (directionsRenderer == '') {
      directionsRenderer = new google.maps.DirectionsRenderer({
        draggable: true,
        map,
      });
    }
    calculateAndDisplayRoute();
  });
  // 按清除時，清除掉路徑、點位、listener
  $('#deleteRoute').on('click', () => {
    if (directionsRenderer !== '') {
      directionsRenderer.setMap(null);
    }
    directionsRenderer = '';
    $('#startMarker').val('');
    startLatLng = '';
    $('#endMarker').val('');
    endLatLng = '';
    startMarker.setMap(null);
    endMarker.setMap(null);
    clearDestinationError();
    isStart = 0;
    isEnd = 0;
  });
  // 關閉這個 list 的時候，刪除監聽與按鈕的 active
  const observer = new MutationObserver(function (e) {
    if (e[0].target.classList.length == 1) {
      google.maps.event.removeListener(destinationListener);
      clearDestinationError();
      isStart = 0;
      isEnd = 0;
    }
  });
  const div = document.getElementById('directionsService');
  observer.observe(div, {
    attributes: true,
  });
}
// 判斷是查詢開始還是結束
function startOrEnd() {
  if (isStart == 1) {
    destinationMarker = startMarker;
    destinationInput = $('#startMarker');
    destinationError = $('#startError');
  } else if (isEnd == 1) {
    destinationMarker = endMarker;
    destinationInput = $('#endMarker');
    destinationError = $('#endError');
  }
}
// 搜尋點位
function destinationGeocoder(e, destinationText) {
  startOrEnd();
  let searchType;
  if (e.target.className == 'search_destination') {
    searchType = { address: destinationText };
  } else if (e.target.classList.contains('pick_destination')) {
    searchType = { location: destinationText };
  }
  directionGeocoder
    .geocode(searchType)
    .then((response) => {
      if (e.target.className == 'search_destination') {
        map.setCenter(response.results[0].geometry.location);
      } else if (e.target.className == 'pick_destination') {
        destinationInput.val(response.results[0].formatted_address);
      }
      destinationLatLng = response.results[0].geometry.location;
      destinationMarker.setPosition(destinationLatLng);
      destinationMarker.setMap(map);
      if (isStart == 1) {
        startLatLng = destinationLatLng;
      } else if (isEnd == 1) {
        endLatLng = destinationLatLng;
      }
      isStart = 0;
      isEnd = 0;
    })
    // 若無法找到資料，顯示警示文字
    .catch(function (e) {
      if (e.code == 'ZERO_RESULTS') {
        destinationError.html('無結果，請重新查詢');
      } else if (e.code == 'OVER_QUERY_LIMIT') {
        destinationError.html('點選過快，請稍候');
      }
      destinationInput.addClass('error');
      destinationError.css('display', 'block');
      setTimeout(() => {
        clearDestinationError();
      }, '1500');
      isStart = 0;
      isEnd = 0;
    });
  clearDestinationError();
}
// 呈現規劃路線
function calculateAndDisplayRoute() {
  directionsService
    .route({
      origin: startLatLng,
      destination: endLatLng,
      // 路徑規劃模式為「開車」
      travelMode: google.maps.TravelMode.DRIVING,
    })
    .then((response) => {
      directionsRenderer.setDirections(response);
      startMarker.setMap(null);
      endMarker.setMap(null);
      isStart = 0;
      isEnd = 0;
    })
    .catch((e) => {
      console.log(e);
      $('.inputDestination').addClass('error');
      $('#routeError').css('display', 'block');
      setTimeout(() => {
        clearDestinationError();
        isStart = 0;
        isEnd = 0;
      }, '1500');
    });
}
function clearDestinationError() {
  google.maps.event.removeListener(destinationListener);
  $('#startPicker').removeClass('active');
  $('#startPicker').removeClass('unable');
  $('#endPicker').removeClass('active');
  $('#endPicker').removeClass('unable');
  $('.inputDestination').removeClass('error');
  $('#routeError').css('display', 'none');
  $('#startError').css('display', 'none');
  $('#endError').css('display', 'none');
}

// ■■■■ 排版：設定 aside 每一項的開闔 ■■■■
$('li').hide();
$('.ul_title').on('click', function () {
  if ($(this).parent().hasClass('active')) {
    $('ul').removeClass('active');
    $('li').slideUp(300);
  } else {
    $('ul').removeClass('active');
    $(this).parent().addClass('active');
    $('li').slideUp(300);
    $(this).parent().find('li').slideDown(300);
  }
});

// ■■■■ 設計：設定不同風格的底圖 ■■■■
function styledMap() {
  const styledMapType = new google.maps.StyledMapType(
    [
      {
        featureType: 'administrative',
        elementType: 'labels.text.fill',
        stylers: [
          {
            color: '#6195a0',
          },
        ],
      },
      {
        featureType: 'administrative.province',
        elementType: 'geometry.stroke',
        stylers: [
          {
            visibility: 'off',
          },
        ],
      },
      {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [
          {
            lightness: '0',
          },
          {
            saturation: '0',
          },
          {
            color: '#f5f5f2',
          },
          {
            gamma: '1',
          },
        ],
      },
      {
        featureType: 'landscape.man_made',
        elementType: 'all',
        stylers: [
          {
            lightness: '-3',
          },
          {
            gamma: '1.00',
          },
        ],
      },
      {
        featureType: 'landscape.natural.terrain',
        elementType: 'all',
        stylers: [
          {
            visibility: 'off',
          },
        ],
      },
      {
        featureType: 'poi',
        elementType: 'all',
        stylers: [
          {
            visibility: 'off',
          },
        ],
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry.fill',
        stylers: [
          {
            color: '#bae5ce',
          },
          {
            visibility: 'on',
          },
        ],
      },
      {
        featureType: 'road',
        elementType: 'all',
        stylers: [
          {
            saturation: -100,
          },
          {
            lightness: 45,
          },
          {
            visibility: 'simplified',
          },
        ],
      },
      {
        featureType: 'road.highway',
        elementType: 'all',
        stylers: [
          {
            visibility: 'simplified',
          },
        ],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.fill',
        stylers: [
          {
            color: '#fac9a9',
          },
          {
            visibility: 'simplified',
          },
        ],
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text',
        stylers: [
          {
            color: '#4e4e4e',
          },
        ],
      },
      {
        featureType: 'road.arterial',
        elementType: 'labels.text.fill',
        stylers: [
          {
            color: '#787878',
          },
        ],
      },
      {
        featureType: 'road.arterial',
        elementType: 'labels.icon',
        stylers: [
          {
            visibility: 'off',
          },
        ],
      },
      {
        featureType: 'transit',
        elementType: 'all',
        stylers: [
          {
            visibility: 'simplified',
          },
        ],
      },
      {
        featureType: 'transit.station.airport',
        elementType: 'labels.icon',
        stylers: [
          {
            hue: '#0a00ff',
          },
          {
            saturation: '-77',
          },
          {
            gamma: '0.57',
          },
          {
            lightness: '0',
          },
        ],
      },
      {
        featureType: 'transit.station.rail',
        elementType: 'labels.text.fill',
        stylers: [
          {
            color: '#43321e',
          },
        ],
      },
      {
        featureType: 'transit.station.rail',
        elementType: 'labels.icon',
        stylers: [
          {
            hue: '#ff6c00',
          },
          {
            lightness: '4',
          },
          {
            gamma: '0.75',
          },
          {
            saturation: '-68',
          },
        ],
      },
      {
        featureType: 'water',
        elementType: 'all',
        stylers: [
          {
            color: '#eaf6f8',
          },
          {
            visibility: 'on',
          },
        ],
      },
      {
        featureType: 'water',
        elementType: 'geometry.fill',
        stylers: [
          {
            color: '#c7eced',
          },
        ],
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [
          {
            lightness: '-49',
          },
          {
            saturation: '-53',
          },
          {
            gamma: '0.79',
          },
        ],
      },
    ],
    { name: 'Styled Map' },
  );
  map.mapTypes.set('styled_map', styledMapType);
  map.setMapTypeId('styled_map');
}

// 額外：引入 GeoJson
let placeNameHeart;
let placeInfoWindow;
function myGeoJson() {
  $.getJSON('assets/json/placeNameHeart.geojson', function (data) {
    map.data.addGeoJson(data);
  });
  map.data.setStyle({
    visible: false,
  });
  placeInfoWindow = new google.maps.InfoWindow();
  map.data.addListener('click', function (event) {
    var place = event.feature.h;
    var html = `
      <p style="font-size: 24px; font-weight: 700; margin: 0"}>${place.Name}</p>
      <p style="font-size: 14px; font-weight: 500; margin: 0"}>${place.County}${place.Township}${place.Village}</p>
      <p style="font-size: 14px; font-weight: 500; margin: 0"}>類型：${place.Type}</p>
      `;
    placeInfoWindow.setContent(html);
    placeInfoWindow.setPosition(event.latLng);
    placeInfoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -34) });
    placeInfoWindow.open(map);
  });
}
// 開關 GeoJson（顯示／隱藏）
$('#placeNameHeart').click(() => {
  if ($('#placeNameHeart').prop('checked') == true) {
    map.data.setStyle({
      icon: 'assets/image/pin_placeName.svg',
      visible: true,
    });
    placeInfoWindow.setMap(map);
  } else if ($('#placeNameHeart').prop('checked') == false) {
    map.data.setStyle({
      visible: false,
    });
    placeInfoWindow.setMap(null);
  }
});
