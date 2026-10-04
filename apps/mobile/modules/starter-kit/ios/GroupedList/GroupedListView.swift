import ExpoModulesCore
import UIKit

private final class AppearanceForwardingController: UIViewController {
  var onWillAppear: ((Bool, UIViewControllerTransitionCoordinator?) -> Void)?

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    onWillAppear?(animated, transitionCoordinator)
  }
}

final class GroupedListView: ExpoView, UICollectionViewDelegate, UIGestureRecognizerDelegate {
  let onRowPress = EventDispatcher()
  let onRowToggle = EventDispatcher()

  var pendingSections: [GroupedListSection]?
  var pendingRevision: Int?

  private var sections: [GroupedListSection] = []
  private var rowsById: [String: GroupedListRow] = [:]
  private var toggles: [String: UISwitch] = [:]
  private var reportedHeight: CGFloat = -1
  private var contentSizeObservation: NSKeyValueObservation?
  private var flashWorkItem: DispatchWorkItem?
  private var highlightedIndexPath: IndexPath?
  private weak var hostScrollView: UIScrollView?
  private let appearanceController = AppearanceForwardingController()

  private lazy var collectionView: UICollectionView = {
    let layout = UICollectionViewCompositionalLayout { [weak self] index, environment in
      var config = UICollectionLayoutListConfiguration(appearance: .insetGrouped)
      config.backgroundColor = .clear
      let section = self?.sections.indices.contains(index) == true ? self?.sections[index] : nil
      config.headerMode = section?.header == nil ? .none : .supplementary
      config.footerMode = section?.footer == nil ? .none : .supplementary
      return NSCollectionLayoutSection.list(using: config, layoutEnvironment: environment)
    }
    let view = UICollectionView(frame: .zero, collectionViewLayout: layout)
    view.isScrollEnabled = false
    view.backgroundColor = .clear
    view.contentInsetAdjustmentBehavior = .never
    view.delegate = self
    return view
  }()

  private lazy var dataSource = makeDataSource()

  private lazy var tapGesture: UITapGestureRecognizer = {
    let gesture = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
    gesture.cancelsTouchesInView = false
    gesture.delegate = self
    return gesture
  }()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addSubview(collectionView)
    addGestureRecognizer(tapGesture)
    appearanceController.view = UIView(frame: .zero)
    appearanceController.onWillAppear = { [weak self] animated, coordinator in
      self?.clearSelection(animated: animated, coordinator: coordinator)
    }
    clipsToBounds = true
    contentSizeObservation = collectionView.observe(\.contentSize, options: [.old, .new]) {
      [weak self] _, change in
      guard change.oldValue != change.newValue else { return }
      self?.setNeedsLayout()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    reportHeightIfNeeded(measureContentHeight())
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil else {
      flashWorkItem?.cancel()
      setHighlighted(nil)
      detachAppearanceController()
      return
    }
    attachAppearanceController()
    attachToHostScrollView()
  }

  func applyPendingProps() {
    if let next = pendingSections {
      pendingSections = nil
      update(sections: next)
    }
    if pendingRevision != nil {
      pendingRevision = nil
      syncToggles(animated: true)
    }
  }

  private func update(sections next: [GroupedListSection]) {
    let previousRows = rowsById
    let previousSections = Dictionary(
      sections.map { ($0.id, $0) },
      uniquingKeysWith: { first, _ in first }
    )
    sections = []
    rowsById = [:]

    var snapshot = NSDiffableDataSourceSnapshot<String, String>()
    for section in next where !snapshot.sectionIdentifiers.contains(section.id) {
      sections.append(section)
      snapshot.appendSections([section.id])
      for row in section.rows where rowsById[row.id] == nil {
        rowsById[row.id] = row
        snapshot.appendItems([row.id], toSection: section.id)
      }
    }
    snapshot.reconfigureItems(snapshot.itemIdentifiers.filter { previousRows[$0] != nil })
    let changedSupplementaries = sections.filter { section in
      guard let previous = previousSections[section.id] else { return false }
      return previous.header != section.header || previous.footer != section.footer
    }
    snapshot.reloadSections(changedSupplementaries.map(\.id))

    toggles = toggles.filter { rowsById[$0.key]?.accessory == .toggle }
    collectionView.collectionViewLayout.invalidateLayout()
    dataSource.apply(snapshot, animatingDifferences: false)
    syncToggles(animated: window != nil)
  }

  private func makeDataSource() -> UICollectionViewDiffableDataSource<String, String> {
    let cellRegistration = UICollectionView.CellRegistration<UICollectionViewListCell, String> {
      [weak self] cell, _, id in
      guard let self, let row = self.rowsById[id] else { return }
      self.configure(cell, with: row)
    }
    let headerRegistration = UICollectionView.SupplementaryRegistration<UICollectionViewListCell>(
      elementKind: UICollectionView.elementKindSectionHeader
    ) { [weak self] view, _, indexPath in
      var content = UIListContentConfiguration.header()
      content.text = self?.sections[indexPath.section].header
      view.contentConfiguration = content
    }
    let footerRegistration = UICollectionView.SupplementaryRegistration<UICollectionViewListCell>(
      elementKind: UICollectionView.elementKindSectionFooter
    ) { [weak self] view, _, indexPath in
      var content = UIListContentConfiguration.footer()
      content.text = self?.sections[indexPath.section].footer
      view.contentConfiguration = content
    }

    let dataSource = UICollectionViewDiffableDataSource<String, String>(
      collectionView: collectionView
    ) { collectionView, indexPath, id in
      collectionView.dequeueConfiguredReusableCell(
        using: cellRegistration, for: indexPath, item: id
      )
    }
    dataSource.supplementaryViewProvider = { collectionView, kind, indexPath in
      kind == UICollectionView.elementKindSectionHeader
        ? collectionView.dequeueConfiguredReusableSupplementary(
          using: headerRegistration, for: indexPath)
        : collectionView.dequeueConfiguredReusableSupplementary(
          using: footerRegistration, for: indexPath)
    }
    return dataSource
  }

  private func configure(_ cell: UICollectionViewListCell, with row: GroupedListRow) {
    var content = row.subtitle == nil
      ? UIListContentConfiguration.cell()
      : UIListContentConfiguration.subtitleCell()
    content.text = row.title
    content.secondaryText = row.subtitle
    cell.contentConfiguration = content

    var accessories: [UICellAccessory] = []
    if let value = row.value {
      accessories.append(.label(text: value))
    }
    switch row.accessory {
    case .chevron:
      accessories.append(.disclosureIndicator())
    case .toggle:
      accessories.append(.customView(configuration: .init(
        customView: toggle(for: row),
        placement: .trailing(),
        reservedLayoutWidth: .actual
      )))
    case .checkmark:
      accessories.append(.checkmark())
    case .none:
      break
    }
    cell.accessories = accessories
    cell.accessibilityTraits = row.accessory == .checkmark ? .selected : []
    cell.accessibilityIdentifier = row.accessibilityId
    cell.accessibilityValue = row.value
  }

  private func toggle(for row: GroupedListRow) -> UISwitch {
    if let existing = toggles[row.id] { return existing }
    let toggle = UISwitch()
    toggle.isOn = row.isOn
    toggle.accessibilityLabel = row.title
    toggle.accessibilityIdentifier = row.accessibilityId.map { "\($0).toggle" }
    let id = row.id
    toggle.addAction(UIAction { [weak self, weak toggle] _ in
      guard let toggle else { return }
      self?.onRowToggle(["id": id, "value": toggle.isOn])
    }, for: .valueChanged)
    toggles[row.id] = toggle
    return toggle
  }

  private func syncToggles(animated: Bool) {
    for (id, toggle) in toggles {
      guard let row = rowsById[id], toggle.isOn != row.isOn else { continue }
      toggle.setOn(row.isOn, animated: animated)
    }
  }

  // UICollectionView only self-sizes cells inside its frame, and lays out
  // nothing at all while RN still gives this view a height of 0. Grow the
  // frame to the content until it settles so the height is reported once.
  private func measureContentHeight() -> CGFloat {
    var height = max(bounds.height, 1)
    for _ in 0..<4 {
      collectionView.frame = CGRect(x: 0, y: 0, width: bounds.width, height: height)
      collectionView.layoutIfNeeded()
      let content = collectionView.collectionViewLayout.collectionViewContentSize.height
      if abs(content - height) <= 0.5 { break }
      height = max(content, 1)
    }
    return height
  }

  private func reportHeightIfNeeded(_ height: CGFloat) {
    guard height > 1, abs(height - reportedHeight) > 0.5 else { return }
    reportedHeight = height
    // A negative width maps to "undefined", so Yoga keeps the width from style.
    setViewSize(CGSize(width: -1, height: height))
  }

  @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
    let location = gesture.location(in: collectionView)
    guard let indexPath = collectionView.indexPathForItem(at: location),
          let id = dataSource.itemIdentifier(for: indexPath),
          let row = rowsById[id], row.pressable
    else { return }

    if row.navigates {
      collectionView.selectItem(at: indexPath, animated: false, scrollPosition: [])
    } else {
      flashHighlight(indexPath)
    }
    onRowPress(["id": id])
  }

  // The host RN scroll view delivers touches without delay, so UIKit's own
  // touch-down highlight would light up every row a scroll starts on.
  // Highlight is driven only by a recognized tap.
  func collectionView(_ collectionView: UICollectionView, shouldHighlightItemAt indexPath: IndexPath) -> Bool {
    false
  }

  func collectionView(_ collectionView: UICollectionView, shouldSelectItemAt indexPath: IndexPath) -> Bool {
    false
  }

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
    if let scroll = hostScrollView, scroll.isDragging || scroll.isDecelerating {
      return false
    }
    var view = touch.view
    while let current = view, current !== self {
      if current is UIControl { return false }
      view = current.superview
    }
    return true
  }

  private func attachToHostScrollView() {
    guard hostScrollView == nil else { return }
    var ancestor = superview
    while let view = ancestor {
      if let scrollView = view as? UIScrollView {
        tapGesture.require(toFail: scrollView.panGestureRecognizer)
        hostScrollView = scrollView
        return
      }
      ancestor = view.superview
    }
  }

  private func setHighlighted(_ next: IndexPath?) {
    guard highlightedIndexPath != next else { return }
    if let current = highlightedIndexPath {
      collectionView.cellForItem(at: current)?.isHighlighted = false
    }
    highlightedIndexPath = next
    if let next {
      collectionView.cellForItem(at: next)?.isHighlighted = true
    }
  }

  private func flashHighlight(_ indexPath: IndexPath) {
    flashWorkItem?.cancel()
    setHighlighted(indexPath)
    let workItem = DispatchWorkItem { [weak self] in
      self?.flashWorkItem = nil
      self?.setHighlighted(nil)
    }
    flashWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.12, execute: workItem)
  }

  // A child controller is the only way for a plain view to receive the
  // owning screen's viewWillAppear and its transition coordinator, which
  // lets the selection fade out in step with an interactive back swipe.
  private func attachAppearanceController() {
    guard appearanceController.parent == nil, let parent = owningViewController() else { return }
    parent.addChild(appearanceController)
    addSubview(appearanceController.view)
    appearanceController.didMove(toParent: parent)
  }

  private func detachAppearanceController() {
    guard appearanceController.parent != nil else { return }
    appearanceController.willMove(toParent: nil)
    appearanceController.view.removeFromSuperview()
    appearanceController.removeFromParent()
  }

  private func owningViewController() -> UIViewController? {
    var responder: UIResponder? = next
    while let current = responder {
      if let controller = current as? UIViewController { return controller }
      responder = current.next
    }
    return nil
  }

  private func clearSelection(animated: Bool, coordinator: UIViewControllerTransitionCoordinator?) {
    guard let indexPath = collectionView.indexPathsForSelectedItems?.first else { return }
    guard let coordinator else {
      collectionView.deselectItem(at: indexPath, animated: animated)
      return
    }
    let started = coordinator.animate(
      alongsideTransition: { [weak self] _ in
        self?.collectionView.deselectItem(at: indexPath, animated: animated)
      },
      completion: { [weak self] context in
        guard context.isCancelled else { return }
        self?.collectionView.selectItem(at: indexPath, animated: false, scrollPosition: [])
      }
    )
    if !started {
      collectionView.deselectItem(at: indexPath, animated: animated)
    }
  }
}
