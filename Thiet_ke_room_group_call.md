# Thiết kế room & group call

## 1) Mục tiêu thiết kế
- Hỗ trợ nhiều người dùng cùng tham gia một phòng (`roomId`) và gọi nhóm theo thời gian thực.
- Tách rõ 2 khái niệm:
  - **Room members**: người đang ở trong phòng chat/chờ.
  - **Call members**: người đang thực sự ở trong phiên gọi.
- Ưu tiên triển khai đơn giản, dễ debug với mô hình **mesh WebRTC** (mỗi cặp người dùng có một `RTCPeerConnection` riêng).

## 2) Mô hình room và trạng thái thành viên

### 2.1 Vòng đời room phía client
1. Người dùng nhập `username` + `roomId` để `createRoom` hoặc `joinRoom`.
2. Server phản hồi danh sách thành viên phòng qua message `roomMembers`.
3. Client cập nhật state:
   - `profile` (username, roomId, joined)
   - `roomMembers` (toàn bộ người trong phòng)
4. Trong quá trình hoạt động:
   - `memberJoinRoom`: thêm người mới vào `roomMembers`.
   - `memberLeaveRoom`: xóa người rời phòng khỏi `roomMembers` và khỏi `callMembers` nếu đang gọi.

### 2.2 Vòng đời group call
1. **Bắt đầu cuộc gọi**: người dùng gọi `startCall`.
2. **Tham gia cuộc gọi đang diễn ra**: người dùng gọi `joinCall`.
3. Server broadcast thay đổi thành viên gọi:
   - `callMembers`: snapshot hiện tại của phiên gọi.
   - `memberJoinCall` / `memberLeaveCall`: event tăng/giảm thành viên.
4. **Rời cuộc gọi**: client gửi `leaveCall`, đóng toàn bộ peer connections, giải phóng media local.

## 3) Thiết kế group call theo mesh

### 3.1 Nguyên tắc mesh
- Với `N` người trong cuộc gọi, mỗi client duy trì tối đa `N-1` kết nối `RTCPeerConnection`.
- Tổng số kết nối toàn hệ thống xấp xỉ `N*(N-1)/2`.
- Mỗi peer được quản lý theo khóa `peerName` trong `Map` (`peersRef`).

### 3.2 Tạo nhiều peer connections
- Khi người dùng vừa `joinCall`, client bật cờ `pendingCallJoin = true`.
- Khi nhận snapshot `callMembers`, client:
  1. Lọc danh sách peer khác mình.
  2. Lần lượt gọi `initiateOfferToPeer(peerName)` cho từng peer.
- Mỗi `peerName` có luồng signaling riêng:
  - `offer` -> `answer` -> `candidate`.
- Nếu đã tồn tại peer connection cho `peerName`, tái sử dụng thay vì tạo mới (tránh duplicate).

### 3.3 Đồng bộ media và đóng kết nối
- Local media được cấp phát lười (`ensureLocalMedia`) khi bắt đầu/tham gia call.
- Mỗi peer connection:
  - add toàn bộ track local (`audio`, `video`).
  - gom track remote vào `MediaStream` riêng và lưu vào `remoteStreams[peerName]`.
- Khi peer rời cuộc gọi/phòng:
  - Đóng `RTCPeerConnection`.
  - Xóa `remoteStreams[peerName]`.
  - Xóa trạng thái kết nối `peerStatuses[peerName]`.

## 4) Giám sát trạng thái kết nối trong cuộc gọi nhóm
- Mỗi tile lưu trạng thái theo peer:
  - `connectionState` (`new`, `connecting`, `connected`, `disconnected`, `failed`, `closed`).
  - `iceConnectionState`.
  - `connectionType` (ví dụ `P2P (host)`, `P2P (srflx)`, `TURN (relay)`).
- Khi `connectionState = connected`, client gọi `getStats()` để phân loại đường truyền thực tế:
  - Có candidate kiểu `relay` -> đánh dấu `TURN (relay)`.
  - Có `srflx` -> đánh dấu `P2P (srflx)`.
  - Ngược lại -> `P2P (host)`.
- Trạng thái được hiển thị trực tiếp trên `VideoTile` để quan sát chất lượng gọi theo từng peer.

## 5) Thiết kế hiển thị video grid cho group call

### 5.1 Dữ liệu đầu vào hiển thị
- `callMembers`: danh sách người đang gọi.
- `localStream`: video local.
- `remoteStreams`: map stream theo từng peer.
- `peerStatuses`: trạng thái kết nối từng peer.
- Cấu hình UI:
  - `layout` (`auto` | `sidebar`)
  - `maxTiles`
  - `pinnedPeers` (danh sách pin có thứ tự)

### 5.2 Layout Auto (mặc định)
- Gom participants gồm local + remotes, ưu tiên các peer được pin.
- Giới hạn số tile hiển thị theo `maxTiles`; phần còn lại hiển thị dạng `+X more participants`.
- Tính toán số cột/hàng tự động bằng `autoGridDims(n, containerRatio)` để tối đa diện tích hiển thị hiệu dụng.
- Áp dụng `clampTileRatio` trong khoảng `[4:3, 16:9]` để hạn chế crop quá mức, chấp nhận letterbox khi cần.

### 5.3 Layout Sidebar
- Vùng chính hiển thị:
  - toàn bộ peer đang pin (theo thứ tự pin), hoặc
  - peer remote đầu tiên nếu chưa pin ai, hoặc
  - local nếu đang chỉ có một mình.
- Vùng strip bên cạnh hiển thị các participant còn lại.
- Không giới hạn `maxTiles` ở chế độ sidebar.

### 5.4 Cơ chế pin tile
- Chỉ cho phép pin peer remote (không pin local).
- Giới hạn tối đa số lượng pin (`MAX_PINS`) để tránh quá tải UI.
- Nút pin trên mỗi tile phản ánh trạng thái:
  - đang pin
  - chưa pin
  - disabled khi đạt giới hạn pin.

## 6) Đánh giá lựa chọn mesh cho bài toán hiện tại

### Ưu điểm
- Triển khai nhanh, logic signaling rõ ràng, dễ đối chiếu log.
- Không cần media server trung gian cho forwarding.
- Phù hợp nhóm nhỏ (demo đồ án, lớp học, họp ngắn).

### Hạn chế
- Số kết nối tăng theo bậc hai khi số người tăng (`O(N^2)`), tăng tải CPU/băng thông client.
- Khi nhóm lớn, chất lượng video/audio suy giảm rõ.
- Khó mở rộng quy mô lớn so với kiến trúc SFU.

### Hướng mở rộng
- Chuyển sang **SFU** để giảm upload tại client và tăng khả năng scale.
- Tối ưu điều phối thành viên theo hướng event-based:
  - thay snapshot full `callMembers` bằng operation `addMember/removeMember` để giảm payload signaling.
- Bổ sung cơ chế adaptive bitrate/simulcast cho nhiều mức mạng.

