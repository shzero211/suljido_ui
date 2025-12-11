// 메인 요소
let map = null; // 지도변수
let currentMarker = null; // 현재 위치 Marker
let markers = []; //주변 Marker
let timer; // 주변 Marker 호출 Timer

//바텀 시트 요소
let bottomSheet = null;
let sheetImage = null;
let sheetTitle = null;
let sheetCategory = null;
let sheetRating = null;
let sheetAddress = null;
let btnDetail = null;
let sheetHandle = null;
let currentStoreId = null;

//리뷰 상세보기 변수 요소
let reviewDetailPage = null;
let btnCloseReview = null;
let reviewStoreTitle = null;
let reviewListContainer = null;

let centerMarkerSrc = null;
let imageSize = null;
let imageOption = null;
let markerImage = null;

document.addEventListener("DOMContentLoaded", () => {
  const apiKey = CONFIG().KAKAO_MAP_API_KEY;
  console.log(`API_KEY: ${apiKey}`);
  loadKakaoMapScript(apiKey);

  // 바텀 시트 요소들 가져오기
  bottomSheet = document.getElementById("bottomSheet");
  sheetImage = document.getElementById("sheetImage");
  sheetTitle = document.getElementById("sheetTitle");
  sheetCategory = document.getElementById("sheetCategoryBadge");
  sheetRating = document.getElementById("sheetRating");
  sheetAddress = document.getElementById("sheetAddress");
  btnDetail = document.getElementById("btnDetail");
  sheetHandle = document.querySelector(".sheet-handle-bar");

  //리뷰 상세보기 변수 요소
  reviewDetailPage = document.getElementById("reviewDetailPage");
  btnCloseReview = document.getElementById("btnCloseReview");
  reviewStoreTitle = document.getElementById("reviewStoreTitle");
  reviewListContainer = document.getElementById("reviewList");

  // 1. 바텀 시트의 "리뷰 보러가기" 버튼 클릭 시
  // (기존 코드에 있는 btnDetail 변수 사용)
  if (btnDetail) {
    btnDetail.addEventListener("click", () => {
      // 현재 선택된 가게 ID가 없으면 실행 안 함
      if (!currentStoreId) {
        console.warn("선택된 가게가 없습니다.");
        return;
      }

      // 현재 바텀 시트에 떠 있는 가게 이름을 가져옴
      const currentStoreName = sheetTitle.innerText;

      // 리뷰 페이지 열기 함수 호출!
      openReviewPage(currentStoreId, currentStoreName);
    });
  }

  // 2. 리뷰 페이지 내부의 "←(뒤로가기)" 버튼 클릭 시
  if (btnCloseReview) {
    btnCloseReview.addEventListener("click", () => {
      // history.back()을 실행하면 브라우저가 'popstate' 이벤트를 발생시킴
      history.back();
    });
  }

  // 3. ★ 브라우저/기기 물리 뒤로가기 버튼 감지 ★ (가장 중요)
  window.addEventListener("popstate", () => {
    // 리뷰 페이지가 열려있는 상태('active' 클래스 보유)라면 닫는다.
    if (reviewDetailPage.classList.contains("active")) {
      closeReviewPage();
    }
    // 만약 바텀시트도 히스토리로 관리하고 싶다면 여기에 추가 로직 작성
  });
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

  //현재 위치 마커 정보
  centerMarkerSrc = "./assets/images/center-marker.png";
  imageSize = new kakao.maps.Size(40, 40); // 이미지 크기
  imageOption = { offset: new kakao.maps.Point(20, 40) }; // 좌표와 일치시킬 이미지 내 위치
  markerImage = new kakao.maps.MarkerImage(
    centerMarkerSrc,
    imageSize,
    imageOption
  );

  //현재 위치 마커 생성
  currentMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat, lng),
    image: markerImage,
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

  // 2. dragstart 이벤트: 사용자가 지도를 움직이려 할 때 창 닫기
  kakao.maps.event.addListener(map, "dragstart", () => {
    closeBottomSheet();
  });

  //지도 빈곳 클릭시 마커 정보 보여주기창 닫기
  kakao.maps.event.addListener(map, "click", () => {
    console.log("지도 빈곳 클릭 - 바텀 시트 닫기");
    closeBottomSheet();
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

      //현재 위치 마커 생성
      currentMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        image: markerImage,
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
  // 2. ★ [핵심 수정] 내 위치 마커 업데이트 로직 변경 ★
  // 기존 마커가 있다면 삭제 (CustomOverlay 갱신을 위해)
  if (currentMarker) {
    currentMarker.setMap(null);
    currentMarker = null;
  }

  //현재 위치 마커 생성
  currentMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(
      map.getCenter().getLat(),
      map.getCenter().getLng()
    ),
    image: markerImage,
  });

  currentMarker.setMap(map);
  //신규 주변 마커 생성
  datas.forEach((data) => {
    const markerPosition = new kakao.maps.LatLng(data.lat, data.lng);
    const marker = new kakao.maps.Marker({
      position: markerPosition,
      title: data.title,
    });
    kakao.maps.event.addListener(marker, "click", () => {
      console.log("마커 클릭:", data.lat, data.lng);
      console.log(
        "마커 클릭:",
        currentMarker.getPosition().getLat(),
        currentMarker.getPosition().getLng()
      );

      if (currentStoreId === data.id) {
        console.log("이미 열린 마커입니다.");
        return;
      }

      bottomSheet.classList.remove("active");

      setTimeout(() => {
        openBottomSheet(data); // 데이터 채우고 active 클래스 추가
        map.panTo(markerPosition); // 지도 중심 이동
      }, 50);
    });
    marker.setMap(map);
    markers.push(marker);
  });
}

//바텀 시트
function openBottomSheet(store) {
  console.log("바텀 시트 열기:", store);
  // (1) 데이터 채우기
  sheetTitle.innerText = store.name;
  sheetAddress.innerText = store.fullAddress || "주소 정보 없음";

  // 평점 (데이터 없으면 0.0)
  sheetRating.innerText = (store.rating || 0.0).toFixed(1);

  // 이미지 (없으면 기본 이미지)
  if (store.image_url) {
    sheetImage.src = store.image_url;
  } else {
    // 기본 이미지 경로 확인 필요!
    sheetImage.src = "/assets/images/default_store.png";
  }

  // ID 저장 (상세보기 클릭 시 사용)
  currentStoreId = store.id;

  // (2) 시트 올리기 (애니메이션 시작)
  bottomSheet.classList.add("active");
}

function closeBottomSheet() {
  bottomSheet.classList.remove("active");
  currentStoreId = null;
}

//리뷰 상세보기 페이지 열기
async function openReviewPage(storeId, storeName) {
  console.log(`리뷰 페이지 열기 시도: ID ${storeId}, 이름 ${storeName}`);

  // 1. UI 초기 세팅
  reviewStoreTitle.innerText = storeName;
  // 로딩 중 표시 (사용자 경험을 위해 중요!)
  reviewListContainer.innerHTML =
    '<li style="padding: 40px 0; text-align: center; color: #888;">리뷰를 불러오는 중...</li>';

  // 2. 화면 열기 (슬라이드 애니메이션 시작)
  reviewDetailPage.classList.add("active");

  // ★★★ 중요: 브라우저 히스토리 추가 ★★★
  // 이걸 해야 모바일에서 기기 '뒤로가기' 버튼 눌렀을 때 앱이 안 꺼지고 리뷰창만 닫힘
  history.pushState({ page: "reviewDetail" }, null, "#review");

  // 3. 서버에서 리뷰 데이터 가져오기
  try {
    // TODO: 실제 서버 API 주소로 변경 필요
    // const response = await ApiClient.get(`/api/stores/${storeId}/reviews`);
    // const reviews = response.data;

    const response = await ApiClient.get(`/api/reviews/${storeId}`);
    const reviews = response.data;
    // -------------------------------------------

    // 4. 가져온 데이터로 화면 그리기 (이전에 만든 함수 활용)
    renderReviews(reviews);
  } catch (error) {
    console.error("리뷰 로딩 실패:", error);
    reviewListContainer.innerHTML =
      '<li style="padding: 40px 0; text-align: center; color: #ff6b6b;">리뷰를 불러오지 못했습니다.</li>';
  }
}

function renderReviews(reviews) {
  const list = document.getElementById("reviewList");
  const avgScoreEl = document.getElementById("reviewAvgScore");
  const totalCountEl = document.getElementById("reviewTotalCount");

  list.innerHTML = ""; // 초기화

  // 1. 상단 요약 정보 업데이트 (예시 로직)
  const totalCount = reviews.length;
  const avgScore =
    totalCount > 0
      ? (reviews.reduce((a, b) => a + b.rating, 0) / totalCount).toFixed(1)
      : "0.0";

  avgScoreEl.innerText = avgScore;
  totalCountEl.innerText = totalCount;

  // 2. 리스트 렌더링
  if (totalCount === 0) {
    list.innerHTML =
      '<li style="padding:40px; text-align:center; color:#999;">첫 번째 리뷰를 남겨주세요!</li>';
    return;
  }

  reviews.forEach((review) => {
    const li = document.createElement("li");
    li.className = "review-item";

    // 별점 문자열 생성 (예: 4 -> ⭐⭐⭐⭐)
    const stars = "⭐".repeat(Math.floor(review.rating));
    const reviewDate = timeAgo(review.createdAt);
    li.innerHTML = `
            <div class="review-meta">
                <span class="review-author">${review.author}</span>
                <span class="review-date">${reviewDate}</span>
            </div>
            <div style="color: #FFD700; font-size: 12px; margin-bottom: 6px;">${stars}</div>
            <div class="review-text">${review.content}</div>
        `;
    list.appendChild(li);
  });
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function closeReviewPage() {
  // active 클래스 제거하여 화면 슬라이드 아웃
  reviewDetailPage.classList.remove("active");

  // (선택사항) 닫을 때 리스트 초기화 (다음에 열 때 깜빡임 방지)
  setTimeout(() => {
    reviewListContainer.innerHTML = "";
  }, 300); // 애니메이션 시간만큼 대기
}
