import ExpoModulesCore

public class StarterKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StarterKit")

    View(GroupedListView.self) {
      ViewName("GroupedList")

      Events("onRowPress", "onRowToggle")

      Prop("sections") { (view: GroupedListView, sections: [GroupedListSection]) in
        view.pendingSections = sections
      }

      Prop("revision") { (view: GroupedListView, revision: Int) in
        view.pendingRevision = revision
      }

      OnViewDidUpdateProps { (view: GroupedListView) in
        view.applyPendingProps()
      }
    }
  }
}
