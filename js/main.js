// 1. 지도와 마커를 담을 변수를 전역(함수 밖)에 선언합니다.
let map = null;
let currentMarker = null;

document.addEventListener("DOMContentLoaded", () => {
  const apiKey = CONFIG.KAKAO_MAP_API_KEY;
  loadKakaoMapScript(apiKey);

  //내위치로 가기 버튼 설정
  document
    .getElementsByClassName("my-location-btn")[0]
    .addEventListener("click", moveToMyLocation);
});

function loadKakaoMapScript(apiKey) {
  const script = document.createElement("script");

  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
  script.async = true; // 비동기 로드 명시

  script.onload = () => {
    kakao.maps.load(() => {
      console.log("카카오 맵 리소스 로드 완료");
      const defaultLat = 37.5665;
      const defaultLng = 126.978;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
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
    console.error("지도를 표시할 div(#map)를 찾을 수 없습니다.");
    return;
  }
  const options = {
    center: new kakao.maps.LatLng(lat, lng),
    level: 7,
  };
  map = new kakao.maps.Map(container, options);
  currentMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat, lng),
  });
  currentMarker.setMap(map);
  console.log("카카오 지도가 성공적으로 로드");
}

function moveToMyLocation() {
  if (!map) return;
  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    return;
  }
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
