// ==========================================
// 1. 요소 가져오기 (DOM Selection)
// ==========================================
// [리뷰 모달 관련]
const openBtn = document.querySelector(".map-review-btn"); // 메인화면 '리뷰 쓰기' 버튼
const reviewModal = document.getElementById("reviewModal");
const reviewCloseBtn = document.getElementById("closeBtn"); // 리뷰 모달 '취소'
const reviewForm = document.getElementById("reviewForm");

// [사진/방문일시 관련]
const photoInput = document.getElementById("photoInput");
const previewContainer = document.getElementById("previewContainer");
const photoPreview = document.getElementById("photoPreview");
const removePhotoBtn = document.getElementById("removePhotoBtn");
const visitTimeInput = document.getElementById("visitTime");

// [검색 모달 관련]
const searchModal = document.getElementById("searchModal");
const keywordInput = document.getElementById("keywordInput");
const searchBtn = document.getElementById("searchBtn"); // 검색 버튼
const closeSearchBtn = document.getElementById("closeSearchBtn"); // 검색 모달 '닫기'
const placesList = document.getElementById("placesList");

// [가게 정보 표시용 (readonly inputs)]
const storeNameInput = document.getElementById("storeName");
const storeAddressInput = document.getElementById("storeAddress");
//[숨겨진 가게 위치 정보]
const storeLatInput = document.getElementById("storeLat");
const storeLngInput = document.getElementById("storeLng");
//[가게 위치 정적이미지]
const staticMapImg = document.getElementById("staticMapImg");
let staticMap = null;
// 카카오 장소 검색 객체
let ps = null;

// 현재 선택된 가게 정보를 저장할 변수
let selectedStoreData = null;

function initSearchModal() {
  if (typeof kakao !== "undefined" && kakao.maps && kakao.maps.services) {
    ps = new kakao.maps.services.Places();

    console.log("✅ 검색 모달 초기화 완료 (Places 객체 생성됨)");
  } else {
    console.error(
      "❌ 카카오 맵 SDK가 로드되지 않아 검색 기능을 쓸 수 없습니다."
    );
  }
}

window.initSearchModal = initSearchModal;

// ==========================================
// 2. 검색 모달 로직 (1단계)
// ==========================================

// 검색 모달 열기
function openSearchModal() {
  console.log("openSearchModal 동작");
  closeBottomSheet(); // 바텀시트 닫기
  searchModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // 초기화
  keywordInput.value = "";
  keywordInput.focus();
  selectedStoreData = null;
  placesList.innerHTML =
    '<li class="placeholder-text">장소를 검색해주세요.</li>';
}

// 검색 모달 닫기
function closeSearchModal() {
  searchModal.classList.add("hidden");
  document.body.style.overflow = ""; // 스크롤 복구
}

// 장소 검색 실행
function searchPlaces() {
  const keyword = keywordInput.value.trim();
  if (!keyword) {
    alert("키워드를 입력해주세요!");
    return;
  }
  ps.keywordSearch(keyword, placesSearchCB);
}

// 검색 결과 콜백
function placesSearchCB(data, status, pagination) {
  if (status === kakao.maps.services.Status.OK) {
    displayPlaces(data);
  } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
    placesList.innerHTML =
      '<li class="placeholder-text">검색 결과가 없습니다.</li>';
  } else if (status === kakao.maps.services.Status.ERROR) {
    alert("검색 중 오류가 발생했습니다.");
  }
}

// 목록 그리기
function displayPlaces(places) {
  placesList.innerHTML = "";

  places.forEach((place) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="place-name">${place.place_name}</div>
      <div class="place-addr">${
        place.road_address_name || place.address_name
      }</div>
    `;

    // 리스트 클릭 시 -> 가게 선택 및 리뷰 모달로 이동
    li.addEventListener("click", () => {
      selectPlace(place);
    });

    placesList.appendChild(li);
  });
}

// [핵심] 가게 선택 후 리뷰 모달로 넘기는 함수
function selectPlace(place) {
  // 1. 선택한 데이터 저장
  selectedStoreData = place;

  // 2. 검색 모달 닫기
  // (overflow hidden은 리뷰 모달에서도 필요하므로 여기서 풀지 않고 클래스만 조작)
  searchModal.classList.add("hidden");

  // 3. 리뷰 모달 열기 호출
  openReviewModal();
}

// ==========================================
// 3. 리뷰 작성 모달 로직 (2단계)
// ==========================================

function openReviewModal() {
  const apiKey = CONFIG().KAKAO_MAP_API_KEY;
  // 가게가 선택되지 않았으면 방어
  if (!selectedStoreData) {
    alert("가게를 먼저 선택해주세요.");
    return;
  }

  // 1. 모달 표시
  reviewModal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // 확실하게 다시 잠금

  // 2. 선택된 가게 정보 입력창에 뿌리기
  storeNameInput.value = selectedStoreData.place_name;
  storeAddressInput.value =
    selectedStoreData.road_address_name || selectedStoreData.address_name;

  // 카카오 API: y가 위도(Latitude), x가 경도(Longitude) -> String 으로 전달됨
  storeLatInput.value = selectedStoreData.y;
  storeLngInput.value = selectedStoreData.x;

  // (디버깅용) 콘솔에서 값 확인
  console.log(
    `위치 정보 저장: 위도(${selectedStoreData.y}), 경도(${selectedStoreData.x})`
  );
  // 👇 [진실의 로그] 브라우저야, 너 지금 얘 크기 몇으로 보고 있니?
  console.log(
    "지도 영역 크기:",
    staticMapImg.offsetWidth,
    staticMapImg.offsetHeight
  );
  setTimeout(() => {
    staticMapImg.innerHTML = "";

    const addressLat = selectedStoreData.y;
    const addressLng = selectedStoreData.x;
    const markerPosition = new kakao.maps.LatLng(addressLat, addressLng);

    const staticMapOption = {
      center: markerPosition, // 이미지 지도의 중심좌표
      level: 3, // 이미지 지도의 확대 레벨
      marker: {
        position: markerPosition,
      },
    };
    staticMap = new kakao.maps.StaticMap(staticMapImg, staticMapOption);

    console.log(staticMap.getCenter());
    staticMapImg.classList.add("visible");
  }, 100);

  // 3. 방문 시간 기본값 (현재 시간)
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  visitTimeInput.value = now.toISOString().slice(0, 16);
}

function closeReviewModal() {
  reviewModal.classList.add("hidden");
  reviewForm.reset();

  // 사진 초기화
  removePhoto();

  document.body.style.overflow = "";
  selectedStoreData = null; // 선택 데이터 초기화
  staticMapImg.classList.remove("visible");
}

// ==========================================
// 4. 사진 업로드 로직
// ==========================================
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 등록할 수 있습니다.");
      photoInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.src = e.target.result;
      previewContainer.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
}

function removePhoto() {
  photoInput.value = "";
  photoPreview.src = "";
  previewContainer.classList.add("hidden");
}

// ==========================================
// 5. 이벤트 리스너 연결 (모두 JS에서 처리)
// ==========================================

// 메인화면 '리뷰 쓰기' 버튼 -> 검색 모달 열기
openBtn.addEventListener("click", openSearchModal);

// 검색 모달 관련
searchBtn.addEventListener("click", searchPlaces);
closeSearchBtn.addEventListener("click", closeSearchModal);
keywordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchPlaces();
});

// 리뷰 모달 관련
reviewCloseBtn.addEventListener("click", closeReviewModal);

// 사진 관련
photoInput.addEventListener("change", handleFileSelect);
removePhotoBtn.addEventListener("click", removePhoto);

// 모달 바깥 클릭 시 닫기
window.addEventListener("click", (e) => {
  if (e.target === searchModal) {
    closeSearchModal();
  }
  if (e.target === reviewModal) {
    closeReviewModal();
  }
});

// 폼 제출
reviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!storeNameInput.value) {
    alert("가게를 선택해주세요!");
    return;
  }

  const formData = new FormData();
  const address = storeAddressInput.value.split(" ");
  const province = address[0]; // 예: "서울특별시", "경기도" 등
  const city = address[1]; // 예: "강남구", "수원시" 등
  const district = address[2]; // 예: "역삼동", "영통구" 등
  const reviewDto = {
    storeName: storeNameInput.value,
    storeAddress: storeAddressInput.value,
    latitude: parseFloat(storeLatInput.value),
    longitude: parseFloat(storeLngInput.value),
    visitTime: visitTimeInput.value,
    category: document.getElementById("category").value,
    rating: parseInt(document.getElementById("rating").value),
    content: document.getElementById("reviewText").value,
    province: province,
    city: city,
    district: district,
  };
  const jsonBlob = new Blob([JSON.stringify(reviewDto)], {
    type: "application/json",
  });
  formData.append("data", jsonBlob);
  const file = photoInput.files[0];
  if (file) {
    formData.append("images", file);
  }
  try {
    const response = await fetch(`${CONFIG().API_BASE_URL}/api/reviews`, {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      alert("리뷰가 성공적으로 제출되었습니다!");
      closeReviewModal();
    } else {
      const errorData = await response.text();
      alert(`리뷰 제출에 실패했습니다: ${errorData.message}`);
    }
  } catch (error) {
    console.error("네트워크 오류:", error);
    alert("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
});
