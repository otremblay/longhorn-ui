import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'dva'
import { routerRedux } from 'dva/router'
import { Row, Col, Button } from 'antd'
import queryString from 'query-string'
import VolumeList from './VolumeList'
import CreateVolume from './CreateVolume'
import ExpansionVolumeSizeModal from './ExpansionVolumeSizeModal'
import ChangeVolumeModal from './ChangeVolumeModal'
import CreatePVAndPVC from './CreatePVAndPVC'
import CreatePVAndPVCSingle from './CreatePVAndPVCSingle'
import WorkloadDetailModal from './WorkloadDetailModal'
import SnapshotDetailModal from './SnapshotDetailModal'
import SnapshotBulkModal from './SnapshotBulkModal'
import AttachHost from './AttachHost'
import EngineUgrade from './EngineUpgrade'
import UpdateReplicaCount from './UpdateReplicaCount'
import Salvage from './Salvage'
import { Filter } from '../../components/index'
import VolumeBulkActions from './VolumeBulkActions'
import CreateBackupModal from './detail/CreateBackupModal.js'
import { genAttachHostModalProps, getEngineUpgradeModalProps, getUpdateReplicaCountModalProps } from './helper'
import { healthyVolume, inProgressVolume, degradedVolume, detachedVolume, faultedVolume, filterVolume, isVolumeImageUpgradable, isVolumeSchedule } from '../../utils/filter'
import { addPrefix } from '../../utils/pathnamePrefix'

class Volume extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      height: 300,
      createBackModalKey: Math.random(),
      createBackModalVisible: false,
      selectedRows: [],
      commandKeyDown: false,
    }
  }

  componentDidMount() {
    let height = document.getElementById('volumeTable').offsetHeight - 79
    this.setState({
      height,
    })
    window.onresize = () => {
      height = document.getElementById('volumeTable').offsetHeight - 79
      this.setState({
        height,
      })
    }
    window.addEventListener('keydown', this.onkeydown)
    window.addEventListener('keyup', this.onkeyup)
  }

  componentWillUnmount() {
    window.onresize = null
    window.removeEventListener('keydown', this.onkeydown)
    window.removeEventListener('keyup', this.onkeyup)
  }

  onkeyup = () => {
    this.setState({
      ...this.state,
      commandKeyDown: false,
    })
  }

  onkeydown = (e) => {
    if ((e.keyCode === 91 || e.keyCode === 17) && !this.state.commandKeyDown) {
      this.setState({
        ...this.state,
        commandKeyDown: true,
      })
    }
  }

  render() {
    const me = this
    const { dispatch, loading, location } = this.props
    const { selected, selectedRows, selectPVCaction, data, createPVAndPVCVisible, createPVAndPVCSingleVisible, createVolumeModalVisible, WorkloadDetailModalVisible, SnapshotDetailModalVisible, WorkloadDetailModalItem, SnapshotDetailModalItem, createPVAndPVCModalKey, createPVAndPVCModalSingleKey, createVolumeModalKey, WorkloadDetailModalKey, SnapshotDetailModalKey, attachHostModalVisible, attachHostModalKey, bulkAttachHostModalVisible, bulkAttachHostModalKey, engineUpgradeModalVisible, engineUpgradeModaKey, bulkEngineUpgradeModalVisible, bulkEngineUpgradeModalKey, salvageModalVisible, updateReplicaCountModalVisible, updateReplicaCountModalKey, sorter, defaultPVName, defaultPVCName, pvNameDisabled, defaultNamespace, nameSpaceDisabled, changeVolumeModalKey, changeVolumeModalVisible, changeVolumeActivate, nodeTags, diskTags, tagsLoading, previousChecked, previousNamespace, expansionVolumeSizeModalVisible, expansionVolumeSizeModalKey, SnapshotBulkModalKey, SnapshotBulkModalVisible } = this.props.volume
    const hosts = this.props.host.data
    const engineImages = this.props.engineimage.data
    const { field, value, stateValue, nodeRedundancyValue, engineImageUpgradableValue, scheduleValue, pvStatusValue } = queryString.parse(this.props.location.search)
    const volumeFilterMap = {
      healthy: healthyVolume,
      inProgress: inProgressVolume,
      degraded: degradedVolume,
      detached: detachedVolume,
      faulted: faultedVolume,
    }
    data.forEach(vol => {
      const found = hosts.find(h => vol.controller && h.id === vol.controller.hostId)
      if (found) {
        vol.host = found.name
      }
    })
    let volumes = data
    if (field && field === 'status' && volumeFilterMap[stateValue]) {
      volumes = volumeFilterMap[stateValue](volumes)
    } else if (field && field === 'engineImageUpgradable') {
      const defaultImage = engineImages.find(image => image.default === true)
      if (engineImageUpgradableValue === 'yes') {
        volumes = volumes.filter(item => isVolumeImageUpgradable(item, defaultImage))
      } else if (engineImageUpgradableValue === 'no') {
        volumes = volumes.filter(item => !isVolumeImageUpgradable(item, defaultImage))
      }
    } else if (field && field === 'schedule') {
      if (scheduleValue === 'yes') {
        volumes = volumes.filter(item => isVolumeSchedule(item))
      } else if (scheduleValue === 'no') {
        volumes = volumes.filter(item => !isVolumeSchedule(item))
      }
    } else if (field && field === 'pvStatus') {
      if (pvStatusValue === 'available') {
        volumes = volumes.filter(item => item.kubernetesStatus && item.kubernetesStatus.pvStatus === 'Available')
      } else if (pvStatusValue === 'none') {
        volumes = volumes.filter(item => item.kubernetesStatus && item.kubernetesStatus.pvStatus === '')
      } else if (pvStatusValue === 'bound') {
        volumes = volumes.filter(item => item.kubernetesStatus && item.kubernetesStatus.pvStatus === 'Bound')
      } else if (pvStatusValue === 'released') {
        volumes = volumes.filter(item => item.kubernetesStatus && item.kubernetesStatus.pvStatus === 'Released')
      }
    } else if (field && field === 'namespace' && value) {
      volumes = filterVolume(volumes, field, value)
    } else if (field && field === 'replicaNodeRedundancy' && nodeRedundancyValue) {
      volumes = filterVolume(volumes, field, nodeRedundancyValue)
    } else if (field && value && field !== 'status' && field !== 'engineImageUpgradable' && field !== 'replicaNodeRedundancy') {
      volumes = filterVolume(volumes, field, value)
    }
    const volumeListProps = {
      dataSource: volumes,
      loading,
      engineImages,
      height: this.state.height,
      commandKeyDown: this.state.commandKeyDown,
      onSorterChange(s) {
        dispatch({
          type: 'volume/updateSorter',
          payload: { field: s.field, order: s.order, columnKey: s.columnKey },
        })
      },
      sorter,
      takeSnapshot(record) {
        dispatch({
          type: 'volume/actions',
          payload: {
            url: record.actions.snapshotCreate,
            params: {
              name: '',
            },
          },
        })
      },
      showEngineUpgrade(record) {
        dispatch({
          type: 'volume/showEngineUpgradeModal',
          payload: {
            selected: record,
          },
        })
      },
      showAttachHost(record) {
        dispatch({
          type: 'volume/showAttachHostModal',
          payload: {
            selected: record,
          },
        })
      },
      showSnapshots: (record) => {
        dispatch(routerRedux.push({
          pathname: addPrefix(`/volume/${record.name}/snapshots`),
        }))
      },
      showRecurring(record) {
        dispatch({
          type: 'volume/showRecurringModal',
          payload: {
            selected: record,
          },
        })
      },
      deleteVolume(record) {
        dispatch({
          type: 'volume/delete',
          payload: record,
        })
      },
      detach(url) {
        dispatch({
          type: 'volume/detach',
          payload: {
            url,
          },
        })
      },
      showBackups(record) {
        dispatch(routerRedux.push({
          pathname: addPrefix(`/backup/${record.name}`),
          search: queryString.stringify({
            ...queryString.parse(location.search),
            field: 'volumeName',
            keyword: record.name,
          }),
          state: true,
        }))
      },
      showSalvage(record) {
        dispatch({
          type: 'volume/showSalvageModal',
          payload: {
            selected: record,
          },
        })
      },
      showUpdateReplicaCount(record) {
        dispatch({
          type: 'volume/showUpdateReplicaCountModal',
          payload: {
            selected: record,
          },
        })
      },
      rollback(record) {
        dispatch({
          type: 'volume/rollback',
          payload: {
            image: record.currentImage,
            url: record.actions.engineUpgrade,
          },
        })
      },
      createPVAndPVC(actions) {
        dispatch({
          type: 'volume/showCreatePVCAndPVSingleModal',
          payload: actions,
        })
      },
      showWorkloadsStatusDetail(record) {
        dispatch({
          type: 'volume/showWorkloadDetailModal',
          payload: record,
        })
      },
      showExpansionVolumeSizeModal(record) {
        dispatch({
          type: 'volume/showExpansionVolumeSizeModal',
          payload: record,
        })
      },
      showSnapshotDetail(record) {
        if (record) {
          dispatch({
            type: 'volume/showSnapshotDetailModal',
            payload: record,
          })
        }
      },
      changeVolume(record) {
        dispatch({
          type: 'volume/showChangeVolumeModal',
          payload: record.actions.activate,
        })
      },
      onRowClick(record, flag) {
        let selecteRowByClick = [record]

        if (flag) {
          selectedRows.forEach((item) => {
            if (selecteRowByClick.every((ele) => {
              return ele.id !== item.id
            })) {
              selecteRowByClick.push(item)
            } else {
              selecteRowByClick = selecteRowByClick.filter((ele) => {
                return ele.id !== item.id
              })
            }
          })
        }

        dispatch({
          type: 'volume/changeSelection',
          payload: {
            selectedRows: selecteRowByClick,
          },
        })
      },
      rowSelection: {
        selectedRowKeys: selectedRows.map(item => item.id),
        onChange(_, records) {
          dispatch({
            type: 'volume/changeSelection',
            payload: {
              selectedRows: records,
            },
          })
        },
      },
    }

    const volumeFilterProps = {
      location,
      stateOption: [
        { value: 'healthy', name: 'Healthy' },
        { value: 'inProgress', name: 'In Progress' },
        { value: 'degraded', name: 'Degraded' },
        { value: 'faulted', name: 'Fault' },
        { value: 'detached', name: 'Detached' },
      ],
      replicaNodeRedundancyOption: [
        { value: 'yes', name: 'Yes' },
        { value: 'limited', name: 'Limited' },
        { value: 'no', name: 'No' },
      ],
      engineImageUpgradableOption: [
        { value: 'yes', name: 'Yes' },
        { value: 'no', name: 'No' },
      ],
      scheduleOption: [
        { value: 'yes', name: 'Yes' },
        { value: 'no', name: 'No' },
      ],
      pvStatusOption: [
        { value: 'none', name: 'None' },
        { value: 'available', name: 'Available' },
        { value: 'bound', name: 'Bound' },
        { value: 'released', name: 'Released' },
      ],
      fieldOption: [
        { value: 'name', name: 'Name' },
        { value: 'host', name: 'Node' },
        { value: 'status', name: 'Status' },
        { value: 'namespace', name: 'Namespace' },
        { value: 'replicaNodeRedundancy', name: 'Node redundancy' },
        { value: 'engineImageUpgradable', name: 'Engine image upgradable' },
        { value: 'pvName', name: 'PV Name' },
        { value: 'pvcName', name: 'PVC Name' },
        { value: 'pvStatus', name: 'PV Status' },
        { value: 'NodeTag', name: 'Node Tag' },
        { value: 'DiskTag', name: 'Disk Tag' },
        { value: 'schedule', name: 'Scheduled' },
      ],
      onSearch(filter) {
        const { field: filterField, value: filterValue, stateValue: filterStateValue, nodeRedundancyValue: redundancyValue, engineImageUpgradableValue: imageUpgradableValue, scheduleValue: schedulePropValue, pvStatusValue: pvStatusPropValue } = filter
        filterField && (filterValue || filterStateValue || redundancyValue || imageUpgradableValue || schedulePropValue || pvStatusPropValue) ? dispatch(routerRedux.push({
          pathname: addPrefix('/volume'),
          search: queryString.stringify({
            ...queryString.parse(location.search),
            field: filterField,
            value: filterValue,
            stateValue: filterStateValue,
            nodeRedundancyValue: redundancyValue,
            engineImageUpgradableValue: imageUpgradableValue,
            scheduleValue: schedulePropValue,
            pvStatusValue: pvStatusPropValue,
          }),
        })) : dispatch(routerRedux.push({
          pathname: addPrefix('/volume'),
          search: queryString.stringify({}),
        }))
      },
    }

    const attachHostModalProps = genAttachHostModalProps(selected ? [selected] : [], hosts, attachHostModalVisible, dispatch)

    const bulkAttachHostModalProps = {
      items: selectedRows,
      visible: bulkAttachHostModalVisible,
      hosts,
      onOk(selectedHost, disableFrontend, urls) {
        dispatch({
          type: 'volume/bulkAttach',
          payload: {
            host: selectedHost,
            disableFrontend,
            urls,
          },
        })
      },
      onCancel() {
        dispatch({
          type: 'volume/hideBulkAttachHostModal',
        })
        dispatch({
          type: 'app/changeBlur',
          payload: false,
        })
      },
    }

    const engineUpgradeModalProps = getEngineUpgradeModalProps(selected ? [selected] : [], engineImages, engineUpgradeModalVisible, dispatch)

    const bulkEngineUpgradeModalProps = {
      items: selectedRows,
      visible: bulkEngineUpgradeModalVisible,
      engineImages,
      onOk(image, urls) {
        dispatch({
          type: 'volume/bulkEngineUpgrade',
          payload: {
            image,
            urls,
          },
        })
      },
      onCancel() {
        dispatch({
          type: 'volume/hideBulkEngineUpgradeModal',
        })
        dispatch({
          type: 'app/changeBlur',
          payload: false,
        })
      },
    }
    const salvageModalProps = {
      item: selected,
      visible: salvageModalVisible,
      hosts,
      onOk(replicaNames, url) {
        dispatch({
          type: 'volume/salvage',
          payload: {
            replicaNames,
            url,
          },
        })
      },
      onCancel() {
        dispatch({
          type: 'volume/hideSalvageModal',
        })
        dispatch({
          type: 'app/changeBlur',
          payload: false,
        })
      },
    }

    const WorkloadDetailModalProps = {
      visible: WorkloadDetailModalVisible,
      item: WorkloadDetailModalItem,
      onOk() {
        dispatch({ type: 'volume/hideWorkloadDetailModal' })
      },
      onCancel() {
        dispatch({ type: 'volume/hideWorkloadDetailModal' })
      },
    }

    const SnapshotDetailModalProps = {
      visible: SnapshotDetailModalVisible,
      selectedVolume: SnapshotDetailModalItem,
      loading,
      dispatch,
      onCancel() {
        dispatch({ type: 'volume/hideSnapshotDetailModal' })
      },
    }

    const SnapshotBulkModalProps = {
      visible: SnapshotBulkModalVisible,
      selectedRows,
      loading,
      dispatch,
      onCancel() {
        dispatch({ type: 'volume/hideSnapshotBulkModal' })
      },
    }

    const settings = this.props.setting.data
    const defaultReplicaCountSetting = settings.find(s => s.id === 'default-replica-count')
    const defaultNumberOfReplicas = defaultReplicaCountSetting !== undefined ? parseInt(defaultReplicaCountSetting.value, 10) : 3
    const createVolumeModalProps = {
      item: {
        numberOfReplicas: defaultNumberOfReplicas,
        size: 20,
        iops: 1000,
        frontend: 'iscsi',
        diskSelector: [],
        nodeSelector: [],
      },
      nodeTags,
      diskTags,
      tagsLoading,
      hosts,
      visible: createVolumeModalVisible,
      onOk(newVolume) {
        dispatch({
          type: 'volume/create',
          payload: newVolume,
        })
      },
      onCancel() {
        dispatch({
          type: 'volume/hideCreateVolumeModal',
        })
        dispatch({
          type: 'app/changeBlur',
          payload: false,
        })
      },
    }

    const expansionVolumeSizeModalProps = {
      item: {
        size: 20,
      },
      hosts,
      visible: expansionVolumeSizeModalVisible,
      selected,
      onOk(params) {
        dispatch({
          type: 'volume/expandVolume',
          payload: {
            params,
            selected,
          },
        })
      },
      onCancel() {
        dispatch({
          type: 'volume/hideExpansionVolumeSizeModal',
        })
      },
    }

    const changeVolumeModalProps = {
      item: {
        frontend: 'iscsi',
      },
      hosts,
      visible: changeVolumeModalVisible,
      onOk(newVolume) {
        let volumeData = Object.assign(newVolume, { url: changeVolumeActivate })
        dispatch({
          type: 'volume/volumeActivate',
          payload: volumeData,
        })
      },
      onCancel() {
        dispatch({
          type: 'volume/hideChangeVolumeModal',
        })
      },
    }

    const createPVAndPVCProps = {
      item: defaultNamespace,
      visible: createPVAndPVCVisible,
      nameSpaceDisabled,
      selectPVCaction,
      previousChecked,
      onOk(params) {
        dispatch({
          type: 'volume/createPVAndPVC',
          payload: {
            action: selectPVCaction,
            params,
          },
        })
      },
      onCancel() {
        dispatch({
          type: 'volume/hideCreatePVAndPVCModal',
        })
      },
      onChange() {
        dispatch({
          type: 'volume/changeCheckbox',
        })
      },
      setPreviousChange(checked) {
        dispatch({
          type: 'volume/setPreviousChange',
          payload: checked,
        })
      },
    }

    const createPVAndPVCSingleProps = {
      item: {
        defaultPVName,
        defaultPVCName,
        previousNamespace,
        pvNameDisabled,
      },
      selected: selectPVCaction.kubernetesStatus ? selectPVCaction.kubernetesStatus : {},
      visible: createPVAndPVCSingleVisible,
      nameSpaceDisabled,
      previousChecked,
      onOk(params) {
        dispatch({
          type: 'volume/createPVAndPVCSingle',
          payload: {
            action: selectPVCaction,
            params,
          },
        })
      },
      onCancel() {
        dispatch({
          type: 'volume/hideCreatePVCAndPVSingleModal',
        })
      },
      onChange() {
        dispatch({
          type: 'volume/changeCheckbox',
        })
      },
      setPreviousChange(checked) {
        dispatch({
          type: 'volume/setPreviousChange',
          payload: checked,
        })
      },
    }

    const volumeBulkActionsProps = {
      selectedRows,
      engineImages,
      commandKeyDown: this.state.commandKeyDown,
      bulkDeleteVolume() {
        dispatch({
          type: 'volume/bulkDelete',
          payload: selectedRows,
        })
      },
      showBulkEngineUpgrade() {
        dispatch({
          type: 'volume/showBulkEngineUpgradeModal',
        })
      },
      showBulkAttachHost() {
        dispatch({
          type: 'volume/showBulkAttachHostModal',
        })
      },
      bulkDetach(urls) {
        dispatch({
          type: 'volume/bulkDetach',
          payload: urls,
        })
      },
      bulkBackup(actions) {
        // bulkBackup(actions.map(item => { return { snapshotCreateUrl: item.actions.snapshotCreate, snapshotBackupUrl: item.actions.snapshotBackup } }))
        // dispatch({
        //   type: 'volume/bulkBackup',
        //   payload: actions,
        // })
        me.setState({
          ...me.state,
          createBackModalKey: Math.random(),
          createBackModalVisible: true,
          selectedRows: actions,
        })
      },
      createSchedule(actions) {
        dispatch({ type: 'volume/showSnapshotBulkModal', payload: actions })
      },
      createPVAndPVC(actions) {
        dispatch({
          type: 'volume/showCreatePVAndPVCModal',
          payload: actions,
        })
      },
    }

    const createBackModalProps = {
      item: {
        frontend: 'iscsi',
      },
      visible: me.state.createBackModalVisible,
      onOk(obj) {
        dispatch({
          type: 'volume/bulkBackup',
          payload: {
            actions: me.state.selectedRows.map(item => { return { snapshotCreateUrl: item.actions.snapshotCreate, snapshotBackupUrl: item.actions.snapshotBackup } }),
            labels: obj,
          },
        })
        me.setState({
          ...me.state,
          createBackModalKey: Math.random(),
          createBackModalVisible: false,
        })
      },
      onCancel() {
        me.setState({
          ...me.state,
          createBackModalKey: Math.random(),
          createBackModalVisible: false,
        })
      },
    }

    const addVolume = () => {
      dispatch({
        type: 'volume/showCreateVolumeModalBefore',
      })
      this.setState({
        CreateVolumeGen() {
          return <CreateVolume {...createVolumeModalProps} />
        },
      })
    }

    const updateReplicaCountModalProps = getUpdateReplicaCountModalProps(selected, updateReplicaCountModalVisible, dispatch)

    return (
      <div className="content-inner" style={{ display: 'flex', flexDirection: 'column', overflow: 'visible !important' }}>
        <Row gutter={24}>
          <Col lg={17} md={15} sm={24} xs={24}>
            <VolumeBulkActions {...volumeBulkActionsProps} />
          </Col>
          <Col lg={7} md={9} sm={24} xs={24} style={{ marginBottom: 16 }}>
            <Filter {...volumeFilterProps} />
          </Col>
        </Row>
        <Button style={{ position: 'absolute', top: '-50px', right: '0px' }} size="large" type="primary" onClick={addVolume}>Create Volume</Button>
        <VolumeList {...volumeListProps} />
        {WorkloadDetailModalVisible ? <WorkloadDetailModal key={WorkloadDetailModalKey} {...WorkloadDetailModalProps} /> : ''}
        {SnapshotBulkModalVisible ? <SnapshotBulkModal key={SnapshotBulkModalKey} {...SnapshotBulkModalProps}></SnapshotBulkModal> : ''}
        {SnapshotDetailModalVisible ? <SnapshotDetailModal key={SnapshotDetailModalKey} {...SnapshotDetailModalProps} /> : ''}
        {changeVolumeModalVisible ? <ChangeVolumeModal key={changeVolumeModalKey} {...changeVolumeModalProps} /> : ''}
        {expansionVolumeSizeModalVisible ? <ExpansionVolumeSizeModal key={expansionVolumeSizeModalKey} {...expansionVolumeSizeModalProps}></ExpansionVolumeSizeModal> : ''}
        {createVolumeModalVisible ? <CreateVolume key={createVolumeModalKey} {...createVolumeModalProps} /> : ''}
        {createPVAndPVCVisible ? <CreatePVAndPVC key={createPVAndPVCModalKey} {...createPVAndPVCProps} /> : ''}
        {createPVAndPVCSingleVisible ? <CreatePVAndPVCSingle key={createPVAndPVCModalSingleKey} {...createPVAndPVCSingleProps} /> : ''}
        {attachHostModalVisible ? <AttachHost key={attachHostModalKey} {...attachHostModalProps} /> : ''}
        {bulkAttachHostModalVisible ? <AttachHost key={bulkAttachHostModalKey} {...bulkAttachHostModalProps} /> : ''}
        {engineUpgradeModalVisible ? <EngineUgrade key={engineUpgradeModaKey} {...engineUpgradeModalProps} /> : ''}
        {bulkEngineUpgradeModalVisible ? <EngineUgrade key={bulkEngineUpgradeModalKey} {...bulkEngineUpgradeModalProps} /> : ''}
        {me.state.createBackModalVisible ? <CreateBackupModal key={this.state.createBackModalKey} {...createBackModalProps} /> : ''}
        {salvageModalVisible ? <Salvage {...salvageModalProps} /> : ''}
        {updateReplicaCountModalVisible ? <UpdateReplicaCount key={updateReplicaCountModalKey} {...updateReplicaCountModalProps} /> : ''}
      </div>
    )
  }
}

Volume.propTypes = {
  volume: PropTypes.object,
  location: PropTypes.object,
  dispatch: PropTypes.func,
  loading: PropTypes.bool,
  host: PropTypes.object,
  engineimage: PropTypes.object,
  setting: PropTypes.object,
}

export default connect(({ engineimage, host, volume, setting, loading }) => ({ engineimage, host, volume, setting, loading: loading.models.volume }))(Volume)
