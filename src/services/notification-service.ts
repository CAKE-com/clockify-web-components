import EventBus from "./event-bus";

class NotificationService {

  static success(message: string, data?: any) {
    EventBus.dispatchEvent(new CustomEvent("success", { detail: { message, data } }));
  }

  static error(error: any) {
    EventBus.dispatchEvent(new CustomEvent("error", { detail: error }));
  }
}

export default NotificationService;