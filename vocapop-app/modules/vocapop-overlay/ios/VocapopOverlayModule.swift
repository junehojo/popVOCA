import ExpoModulesCore

// iOS는 다른 앱 위 오버레이를 지원하지 않음 (Apple 정책). no-op 스텁.
public class VocapopOverlayModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VocapopOverlay")
    Function("requestPermission") { () -> Bool in false }
    Function("start") { (_ wordsJson: String) in }
    Function("stop") { }
  }
}
