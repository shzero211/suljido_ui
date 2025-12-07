let map = null; // 지도변수
let currentMarker = null; // 현재 위치 Marker
let markers = []; //주변 Marker
let timer; // 주변 Marker 호출 Timer

document.addEventListener("DOMContentLoaded", () => {
  const apiKey = CONFIG().KAKAO_MAP_API_KEY;
  console.log(`API_KEY: ${apiKey}`);
  loadKakaoMapScript(apiKey);
});

//지도 초기 설정
function loadKakaoMapScript(apiKey) {
  const script = document.createElement("script");

  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
  script.async = true; // 비동기 로드 명시

  script.onload = () => {
    kakao.maps.load(() => {
      console.log("카카오 맵 리소스 로드 완료");
      //Modal.js 쪽 kakao 와 연관된 places 함수 초기화
      if (window.initSearchModal) {
        window.initSearchModal();
      }
      //기본 위치 값
      const defaultLat = 37.5665;
      const defaultLng = 126.978;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            //GPS로 현재 내 위치 정보 추출
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log("내 위치로 시작합니다:", lat, lng);
            initMap(lat, lng);
          },
          (err) => {
            console.warn("위치 권한 거부됨. 기본 위치로 시작합니다.", err);
            initMap(defaultLat, defaultLng);
          }
        );
      } else {
        console.log("not navi");
        initMap(defaultLat, defaultLng);
      }
    });
  };
  script.onerror = () => {
    console.error(
      "카카오 지도 스크립트 로드 실패! API 키나 네트워크를 확인하세요."
    );
  };

  document.head.appendChild(script);
}

function initMap(lat, lng) {
  console.log("Init 시작");
  const containers = document.getElementsByClassName("map");
  const container = containers[0]; // [0]을 붙여서 첫 번째 요소를 꺼내야 함
  if (!container) {
    console.error("지도를 표시할 Map을 찾을 수 없습니다.");
    return;
  }
  const options = {
    center: new kakao.maps.LatLng(lat, lng),
    level: 7,
  };
  // 지도 생성
  map = new kakao.maps.Map(container, options);

  //현재 위치 마커 생성
  currentMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat, lng),
  });
  currentMarker.setMap(map);

  //로드시 첫 주변 탐색
  searchNearbyStores();

  //화면 이동시 주변가게탐색 Listener
  kakao.maps.event.addListener(map, "idle", () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      console.log("지도가 이동하였습니다.");
      searchNearbyStores();
    }, 500);
  });

  //내위치로 가기 버튼 Listener
  document
    .getElementsByClassName("my-location-btn")[0]
    .addEventListener("click", moveToMyLocation);

  console.log("카카오 지도가 성공적으로 로드");
}

//현재 위치 정보로 이동
function moveToMyLocation() {
  if (!map) return;
  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    return;
  }
  //현재 위치정보 가져오기
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const locPosition = new kakao.maps.LatLng(lat, lng);
      map.panTo(locPosition);
      if (currentMarker) {
        currentMarker.setMap(null);
      }
      currentMarker = new kakao.maps.Marker({
        position: locPosition,
      });
      currentMarker.setMap(map);
      console.log(`내 위치로 이동 완료: ${lat}, ${lng}`);
    },
    (err) => {
      // 실패 시
      console.error(err);
      alert("위치 정보를 가져올 수 없습니다. (권한 거부 또는 HTTPS 미사용)");
    }
  );
}

async function searchNearbyStores() {
  if (!map) return;
  const centerLatLng = map.getCenter();
  const lat = centerLatLng.getLat();
  const lng = centerLatLng.getLng();
  console.log(lat, lng);

  const response = await ApiClient.get(
    `/api/stores/nearby?lat=${lat}&lng=${lng}&km=5.0`
  );
  const stores = response.data;
  console.log(stores);
  renderMarkers(stores);
}

function renderMarkers(datas) {
  if (!map) return;
  //기존 주변 마커 삭제
  if (markers) {
    markers.forEach((marker) => {
      marker.setMap(null);
    });
    markers = [];
  }
  //CurrentMarker 업데이트
  if (currentMarker) {
    currentMarker.setMap(null);
    currentMarker = null;
  }
  currentMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(
      map.getCenter().getLat(),
      map.getCenter().getLng()
    ),
  });
  currentMarker.setMap(map);

  //신규 주변 마커 생성
  datas.forEach((data) => {
    const markerPosition = new kakao.maps.LatLng(data.lat, data.lng);
    const marker = new kakao.maps.Marker({
      position: markerPosition,
      title: data.title,
    });
    marker.setMap(map);
    markers.push(marker);
  });
}
