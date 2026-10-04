import ExpoModulesCore

enum GroupedListAccessory: String, Enumerable {
  case none
  case chevron
  case toggle
  case checkmark
}

struct GroupedListRow: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var subtitle: String?
  @Field var value: String?
  @Field var accessory: GroupedListAccessory = .none
  @Field var isOn: Bool = false
  @Field var pressable: Bool = false
  @Field var navigates: Bool = false
  @Field var accessibilityId: String?
}

struct GroupedListSection: Record {
  @Field var id: String = ""
  @Field var header: String?
  @Field var footer: String?
  @Field var rows: [GroupedListRow] = []
}
