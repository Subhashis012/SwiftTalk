import { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { Info, X } from "lucide-react";
import RightSidebar from "./RightSidebar";

let typingTimeout;

const ChatContainer = () => {
  const { authUser, socket, onlineUsers } = useContext(AuthContext);
  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages } =
    useContext(ChatContext);

  const [input, setInput] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const scollEnd = useRef(null);

  // Send text message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return;

    await sendMessage({ text: input.trim() });
    setInput("");
    socket?.emit("stopTyping", { to: selectedUser._id }); // stop typing on send
  };

  // Send image message
  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
      e.target.value = ""; // Reset
    };
    reader.readAsDataURL(file);
  };

  // Emit typing event
  const handleTyping = () => {
    if (!socket || !selectedUser) return;

    socket.emit("typing", { to: selectedUser._id });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping", { to: selectedUser._id });
    }, 2000);
  };

  // Load messages when user selected
  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scollEnd.current && messages) {
      scollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Listen for typing events
  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleUserTyping = ({ from }) => {
      if (from === selectedUser._id) {
        setOtherUserTyping(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => setOtherUserTyping(false), 3000);
      }
    };

    socket.on("userTyping", handleUserTyping);
    socket.on("userStopTyping", () => setOtherUserTyping(false));

    return () => {
      socket.off("userTyping", handleUserTyping);
      socket.off("userStopTyping");
    };
  }, [socket, selectedUser]);

  return selectedUser ? (
    <div className="h-full overflow-scroll relative backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 rounded-full"
        />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <Info
            onClick={() => setShowInfo(!showInfo)}
            className="w-5 h-5 text-white cursor-pointer"
          />
          <X
            onClick={() => setSelectedUser(null)}
            className="w-6 h-6 text-white cursor-pointer"
          />
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 justify-end ${
              msg.senderId !== authUser._id && "flex-row-reverse"
            }`}
          >
            {msg.image ? (
              <img
                src={msg.image}
                alt=""
                className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8"
              />
            ) : (
              <p
                className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${
                  msg.senderId === authUser._id
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                }`}
              >
                {msg.text}
              </p>
            )}
            <div className="text-center text-xs">
              <img
                src={
                  msg.senderId === authUser._id
                    ? authUser?.profilePic || assets.avatar_icon
                    : selectedUser?.profilePic || assets.avatar_icon
                }
                className="w-7 rounded-full"
                alt=""
              />
              <p className="text-gray-500">{formatMessageTime(msg.createdAt)}</p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {otherUserTyping && (
          <p className="text-sm italic text-gray-400 mb-2 px-3">Typing...</p>
        )}

        <div className="" ref={scollEnd}></div>
      </div>

      {/* Bottom Input */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3">
        <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
          <input
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            value={input}
            onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
            type="text"
            placeholder="Type a message"
            className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400"
          />
          <input
            onChange={handleSendImage}
            type="file"
            id="image"
            accept="image/png, image/jpeg"
            hidden
          />
          <label htmlFor="image">
            <img
              src={assets.gallery_icon}
              alt="gallery"
              className="w-5 mr-2 cursor-pointer"
            />
          </label>
        </div>
        <img
          onClick={handleSendMessage}
          src={assets.send_button}
          alt="send"
          className="w-7 cursor-pointer"
        />
      </div>

      {/* Right Sidebar */}
      {showInfo && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-10 md:hidden"
            onClick={() => setShowInfo(false)}
          />
          <div className="absolute md:static right-0 top-0 z-20 h-full w-[300px] bg-[#1a1a2e]">
            <RightSidebar selectedUser={selectedUser} />
            <div className="absolute top-3 right-3 md:hidden">
              <X
                onClick={() => setShowInfo(false)}
                className="text-white cursor-pointer w-6 h-6"
              />
            </div>
          </div>
        </>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden">
      <img src={assets.logo_icon} alt="" className="max-w-16" />
      <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
    </div>
  );
};

export default ChatContainer;
